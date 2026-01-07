import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Carousel,
  Card,
  Button,
  Spinner,
  Alert,
  Modal,
  Form,
} from "react-bootstrap";
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEthereum,
  FaPercentage,
} from "react-icons/fa";
import { getImageUrl, getAllImageUrls } from "../utils/imageUtils";
import {
  purchaseShares,
  getCurrentAccount,
  getEthPriceInUsd,
} from "../utils/blockchain";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [shares, setShares] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [userShares, setUserShares] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        console.log("Fetching property data...");
        const [propertyRes, transactionsRes] = await Promise.all([
          fetch(`http://localhost:4000/api/properties/${id}`),
          fetch(`http://localhost:4000/api/purchase/property/${id}`),
        ]);

        if (!propertyRes.ok) throw new Error("Failed to fetch property");
        if (!transactionsRes.ok)
          throw new Error("Failed to fetch transactions");

        const propertyData = await propertyRes.json();
        const transactions = await transactionsRes.json();

        console.log("Property data received:", {
          propertyData,
          hasFractionalToken: !!propertyData.fractionalToken,
          fractionalToken: propertyData.fractionalToken,
        });

        // Calculate user's shares if logged in
        if (currentUser) {
          const userTransaction = transactions.find(
            (tx) =>
              tx.buyer?._id === currentUser.id && tx.status === "completed"
          );

          if (userTransaction) {
            setUserShares(userTransaction.shares);
          }
        }

        setProperty({
          ...propertyData,
          // Add any additional property processing here
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, currentUser]);

  const handlePurchase = async () => {
    if (!currentUser) {
      navigate("/login", { state: { from: `/properties/${id}` } });
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseError("");
      setPurchaseSuccess("");

      // Get current account from MetaMask
      const account = await getCurrentAccount();
      if (!account) {
        throw new Error("Please connect your wallet");
      }

      // Get current ETH price in USD and calculate total cost in ETH
      const ethPriceInUsd = await getEthPriceInUsd();
      const totalCostInUsd = shares * parseFloat(property.sharePrice);
      const totalCostInEth = (totalCostInUsd / ethPriceInUsd).toFixed(8);

      console.log("Purchase details:", {
        shares,
        sharePrice: property.sharePrice,
        ethPriceInUsd,
        totalCostInUsd,
        totalCostInEth,
        propertyId: property._id,
        propertyTitle: property.title,
      });

      if (!property.fractionalToken) {
        throw new Error(
          "This property is not yet available for fractional ownership. Please contact support."
        );
      }

      // Call blockchain function to purchase shares
      const result = await purchaseShares(
        property.fractionalToken,
        shares,
        totalCostInEth
      );

      console.log("Purchase result:", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to purchase shares");
      }

      // Record the transaction in our database
      const response = await axios.post(
        "http://localhost:4000/api/purchase/",
        {
          propertyId: id,
          shares,
          transactionHash: result.transactionHash,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update UI
      setUserShares((prev) => prev + shares);
      setPurchaseSuccess(`Successfully purchased ${shares} shares!`);

      // Update property data
      const updatedProperty = { ...property };
      updatedProperty.availableShares -= shares;
      if (updatedProperty.availableShares === 0) {
        updatedProperty.status = "sold";
      }
      setProperty(updatedProperty);

      // Close modal after delay
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Purchase error:", error);
      setPurchaseError(error.message || "Failed to complete purchase");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          {error}
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate("/")}>
              Back to Properties
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!property) {
    return (
      <Container className="my-5">
        <Alert variant="warning">Property not found</Alert>
      </Container>
    );
  }

  // Calculate ownership percentage
  const ownershipPercentage =
    property.totalShares > 0
      ? ((userShares / property.totalShares) * 100).toFixed(2)
      : 0;

  return (
    <Container className="my-5">
      <Button
        variant="outline-secondary"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        ← Back to Properties
      </Button>

      <h1 className="mb-3">{property.title}</h1>
      <p className="text-muted mb-4">
        <FaMapMarkerAlt className="me-2" />
        {property.address.street}, {property.address.city},{" "}
        {property.address.state} {property.address.zipCode}
      </p>

      <Row className="mb-5">
        <Col lg={8}>
          {property.images && property.images.length > 0 ? (
            <Carousel className="mb-4">
              {getAllImageUrls(property.images).map((imageUrl, index) => (
                <Carousel.Item key={index}>
                  <div style={{ height: "500px", overflow: "hidden" }}>
                    <img
                      className="d-block w-100"
                      src={imageUrl}
                      alt={`${property.title} - ${index + 1}`}
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          ) : (
            <div
              className="bg-light d-flex align-items-center justify-content-center"
              style={{ height: "400px" }}
            >
              <div className="text-center text-muted">
                <div className="display-1">🏠</div>
                <p>No images available</p>
              </div>
            </div>
          )}

          <Card className="mb-4">
            <Card.Body>
              <h3 className="mb-4">Property Details</h3>
              <Row className="mb-4">
                <Col md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-light p-3 rounded-circle me-3">
                      <FaBed className="text-primary" size={24} />
                    </div>
                    <div>
                      <div className="text-muted">Bedrooms</div>
                      <div className="h5 mb-0">{property.bedrooms}</div>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-light p-3 rounded-circle me-3">
                      <FaBath className="text-primary" size={24} />
                    </div>
                    <div>
                      <div className="text-muted">Bathrooms</div>
                      <div className="h5 mb-0">{property.bathrooms}</div>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-light p-3 rounded-circle me-3">
                      <FaRulerCombined className="text-primary" size={24} />
                    </div>
                    <div>
                      <div className="text-muted">Area</div>
                      <div className="h5 mb-0">{property.squareFeet} sqft</div>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-light p-3 rounded-circle me-3">
                      <FaCalendarAlt className="text-primary" size={24} />
                    </div>
                    <div>
                      <div className="text-muted">Year Built</div>
                      <div className="h5 mb-0">{property.yearBuilt}</div>
                    </div>
                  </div>
                </Col>
              </Row>

              <h4 className="mb-3">Description</h4>
              <p className="text-muted">
                {property.description || "No description available."}
              </p>

              {property.features && property.features.length > 0 && (
                <>
                  <h4 className="mt-5 mb-3">Features</h4>
                  <Row>
                    {property.features.map((feature, index) => (
                      <Col key={index} md={6} className="mb-2">
                        <div className="d-flex align-items-center">
                          <div className="me-2">•</div>
                          <div>
                            <strong>{feature.name}:</strong> {feature.value}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="sticky-top" style={{ top: "20px" }}>
            <Card.Body>
              <h3 className="text-primary mb-4">
                ${property.price.toLocaleString()}
              </h3>

              <h2 className="mb-4">${property.price.toLocaleString()}</h2>

              {property.availableShares > 0 ? (
                <>
                  <div className="mb-3">
                    <p className="mb-1">
                      <strong>Available Shares:</strong>{" "}
                      {property.availableShares.toLocaleString()}
                    </p>
                    <p className="mb-1">
                      <strong>Price per Share:</strong> $
                      {property.sharePrice.toLocaleString()}
                    </p>
                    {userShares > 0 && (
                      <p className="text-success mb-0">
                        <FaPercentage className="me-1" />
                        You own {userShares} shares ({ownershipPercentage}%)
                      </p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 mb-3"
                    onClick={() => setShowPurchaseModal(true)}
                    disabled={property.availableShares === 0}
                  >
                    {property.availableShares === 0
                      ? "Sold Out"
                      : "Purchase Shares"}
                  </Button>
                </>
              ) : (
                <Alert variant="info">
                  This property is completely sold out.
                </Alert>
              )}
              <div className="d-grid gap-2 mb-4">
                <Button variant="outline-primary" size="lg">
                  Schedule a Tour
                </Button>
              </div>

              <div className="border-top pt-3">
                <h5 className="mb-3">Property Facts</h5>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Property Type</span>
                  <span>{property.propertyType}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Total Shares</span>
                  <span>{property.totalShares}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Available Shares</span>
                  <span>
                    {property.availableShares || property.totalShares}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Price per Share</span>
                  <span>${property.sharePrice}</span>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="mb-3">Share This Property</h5>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" size="sm">
                    <i className="fab fa-facebook-f"></i>
                  </Button>
                  <Button variant="outline-secondary" size="sm">
                    <i className="fab fa-twitter"></i>
                  </Button>
                  <Button variant="outline-secondary" size="sm">
                    <i className="fas fa-envelope"></i>
                  </Button>
                  <Button variant="outline-secondary" size="sm">
                    <i className="fas fa-link"></i>
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Purchase Modal */}
      <Modal
        show={showPurchaseModal}
        onHide={() => setShowPurchaseModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Purchase Shares</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {purchaseError && (
            <Alert variant="danger" className="mb-3">
              {purchaseError}
            </Alert>
          )}

          {purchaseSuccess ? (
            <Alert variant="success">{purchaseSuccess}</Alert>
          ) : (
            <>
              <p>
                You are about to purchase shares of{" "}
                <strong>{property.title}</strong>.
              </p>

              <Form.Group className="mb-3">
                <Form.Label>
                  Number of Shares (Max: {property.availableShares})
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={property.availableShares}
                  value={shares}
                  onChange={(e) =>
                    setShares(
                      Math.min(
                        parseInt(e.target.value) || 1,
                        property.availableShares
                      )
                    )
                  }
                  disabled={purchasing}
                />
              </Form.Group>

              <div className="bg-light p-3 rounded mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Price per Share:</span>
                  <span>${property.sharePrice.toLocaleString()}</span>
                </div>
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total Cost:</span>
                  <span>
                    <FaEthereum className="me-1" />
                    {(shares * property.sharePrice).toLocaleString()} ETH
                  </span>
                </div>
              </div>

              <Alert variant="info" className="small">
                <strong>Note:</strong> This transaction will be processed on the
                blockchain. Please confirm the transaction in your wallet when
                prompted.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPurchaseModal(false)}
            disabled={purchasing}
          >
            Close
          </Button>

          {!purchaseSuccess && (
            <Button
              variant="primary"
              onClick={handlePurchase}
              disabled={purchasing || property.availableShares === 0}
            >
              {purchasing ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PropertyDetail;

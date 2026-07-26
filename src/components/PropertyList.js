import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Container,
  Spinner,
  Badge,
  Button,
} from "react-bootstrap";
import { getFirstImage } from "../utils/imageUtils";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { FaHome, FaDollarSign, FaChartPie, FaPlus } from "react-icons/fa";
import { getFractionalTokenContract } from "../utils/blockchain";
import Web3 from "web3";

const web3 = window.ethereum ? new Web3(window.ethereum) : null;

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingShares, setLoadingShares] = useState(false);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'listed', 'owned'

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        let url = `${API_BASE_URL}/api/properties`;

        if (activeTab === "listed" && currentUser) {
          url = `${API_BASE_URL}/api/properties/me/listed`;
        } else if (activeTab === "owned" && currentUser) {
          url = `${API_BASE_URL}/api/properties/me/owned`;
        }

        const response = await fetch(url, {
          headers: currentUser
            ? {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              }
            : {},
        });

        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }

        const result = await response.json();
        // Handle both array and object with data property response formats
        setProperties(Array.isArray(result) ? result : result.data || []);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [activeTab, currentUser]);

  // Fetch remaining shares from the blockchain with proper decimal handling
  const fetchRemainingShares = async (property) => {
    if (!property.fractionalToken) return property;
    if (!web3) return property;

    try {
      const contract = getFractionalTokenContract(property.fractionalToken);

      // Get contract balance and decimals in parallel
      const [contractBalance, decimals] = await Promise.all([
        contract.methods.balanceOf(contract._address).call(),
        contract.methods
          .decimals()
          .call()
          .catch(() => "18"), // Default to 18 if not available
      ]);

      // Calculate the divisor based on token decimals
      const divisor = web3.utils.toBN(10).pow(web3.utils.toBN(decimals));
      const remainingShares = web3.utils
        .toBN(contractBalance)
        .div(divisor)
        .toString();

      // Calculate total supply with the same decimal handling
      const totalSupply = await contract.methods.totalSupply().call();
      const totalShares = web3.utils.toBN(totalSupply).div(divisor).toString();

      return {
        ...property,
        availableShares: parseInt(remainingShares, 10),
        totalShares: parseInt(totalShares, 10),
      };
    } catch (err) {
      console.error(`Error fetching shares for property ${property._id}:`, err);
      return property; // Return property as is if there's an error
    } finally {
      // Best-effort enrichment; do not block UI on chain calls.
    }
  };

  // Update properties with remaining shares
  useEffect(() => {
    if (properties.length > 0) {
      const updatePropertiesWithShares = async () => {
        try {
          const updatedProperties = await Promise.all(
            properties.map(fetchRemainingShares),
          );
          setProperties(updatedProperties);
        } catch (err) {
          console.error("Error updating properties with shares:", err);
        } finally {
          // Best-effort enrichment; do not block UI on chain calls.
        }
      };

      updatePropertiesWithShares();
    }
  }, [JSON.stringify(properties.map((p) => p._id))]); // Only run when property IDs change

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
      <div className="alert alert-danger" role="alert">
        Error loading properties: {error}
      </div>
    );
  }

  const renderPropertyCard = (property) => {
    const isOwner = currentUser && property.lister?._id === currentUser.id;
    const userOwnedShares = property.userShares || 0;
    const ownershipPercentage = property.ownershipPercentage || 0;
    const availableShares = property.availableShares || 0;
    const totalShares = property.totalShares || 1;
    const progress = ((totalShares - availableShares) / totalShares) * 100;

    return (
      <Col key={property._id} md={6} lg={4} className="mb-4">
        <Card className="h-100 property-card">
          <div className="property-image-container">
            <Card.Img
              variant="top"
              src={getFirstImage(property.images)}
              alt={property.title}
              className="property-image"
              style={{ height: "200px", objectFit: "cover" }}
            />
            {isOwner && (
              <Badge bg="primary" className="position-absolute top-0 end-0 m-2">
                Your Listing
              </Badge>
            )}
            {userOwnedShares > 0 && (
              <Badge
                bg="success"
                className="position-absolute top-0 start-0 m-2"
              >
                You own {userOwnedShares} shares (
                {ownershipPercentage.toFixed(1)}%)
              </Badge>
            )}
          </div>
          <Card.Body className="d-flex flex-column">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <Card.Title className="mb-1">{property.title}</Card.Title>
              <div className="text-primary fw-bold">
                ${property.sharePrice?.toLocaleString()}{" "}
                <small>per share</small>
              </div>
            </div>
            <Card.Subtitle className="mb-2 text-muted">
              <FaHome className="me-1" />
              {property.address?.street}, {property.address?.city}
            </Card.Subtitle>

            <div className="mt-auto">
              <div className="d-flex justify-content-between mb-2">
                <div>
                  <FaChartPie className="me-1 text-muted" />
                  <small className="text-muted">
                    {totalShares - availableShares} / {totalShares} shares sold
                  </small>
                </div>
                <div>
                  <FaDollarSign className="me-1 text-muted" />
                  <small className="text-muted">
                    {property.price?.toLocaleString()}
                  </small>
                </div>
              </div>
              <div className="progress mb-3" style={{ height: "5px" }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${progress}%` }}
                  aria-valuenow={progress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div className="d-grid">
                <Link
                  to={`/properties/${property._id}`}
                  className="btn btn-primary"
                >
                  {isOwner ? "Manage Property" : "View Details"}
                </Link>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    );
  };

  return (
    <Container className="my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {activeTab === "all" && "All Properties"}
          {activeTab === "listed" && "My Listings"}
          {activeTab === "owned" && "My Investments"}
        </h2>
        {currentUser && (
          <Link to="/properties/new" className="btn btn-primary">
            <FaPlus className="me-2" /> List New Property
          </Link>
        )}
      </div>

      {currentUser && (
        <div className="mb-4">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${
                activeTab === "all" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("all")}
            >
              All Properties
            </button>
            <button
              type="button"
              className={`btn ${
                activeTab === "listed" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("listed")}
            >
              My Listings
            </button>
            <button
              type="button"
              className={`btn ${
                activeTab === "owned" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setActiveTab("owned")}
            >
              My Investments
            </button>
          </div>
        </div>
      )}
      <h2 className="mb-4">Available Properties</h2>
      {properties.length === 0 ? (
        <div className="text-center py-5">
          <h4 className="text-muted mb-4">
            {activeTab === "all"
              ? "No properties found"
              : activeTab === "listed"
                ? "You have no property listings"
                : "You have not invested in any properties yet"}
          </h4>
          {activeTab !== "all" && (
            <Link to="/properties/new" className="btn btn-primary">
              <FaPlus className="me-2" />
              {activeTab === "listed"
                ? "List Your First Property"
                : "Browse Properties"}
            </Link>
          )}
        </div>
      ) : (
        <Row>{properties.map((property) => renderPropertyCard(property))}</Row>
      )}
    </Container>
  );
};

export default PropertyList;

import React, { useState, useEffect } from "react";
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
} from "react-bootstrap";
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaCalendarAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(
          `http://localhost:4000/api/properties/${id}`
        );
        if (!response.ok) {
          throw new Error("Property not found");
        }
        const data = await response.json();
        setProperty(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching property:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

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
              {property.images.map((image, index) => (
                <Carousel.Item key={index}>
                  <div style={{ height: "500px", overflow: "hidden" }}>
                    <img
                      className="d-block w-100"
                      src={image.url}
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

              <div className="d-grid gap-2 mb-4">
                <Button variant="primary" size="lg" className="mb-2">
                  Contact Agent
                </Button>
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
    </Container>
  );
};

export default PropertyDetail;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, Row, Col, Container, Spinner } from "react-bootstrap";
import { getFirstImage } from "../utils/imageUtils";

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/properties");
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        const data = await response.json();
        setProperties(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

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

  return (
    <Container className="my-5">
      <h2 className="mb-4">Available Properties</h2>
      <Row>
        {properties.map((property) => (
          <Col key={property._id} md={4} className="mb-4">
            <Card className="h-100 shadow-sm">
              {property.images && property.images[0] && (
                <div style={{ height: "200px", overflow: "hidden" }}>
                  <Card.Img
                    variant="top"
                    src={getFirstImage(property.images)}
                    alt={property.title}
                    style={{
                      height: "100%",
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
              <Card.Body className="d-flex flex-column">
                <Card.Title>{property.title}</Card.Title>
                <Card.Text className="text-muted">
                  {property.address.street}, {property.address.city},{" "}
                  {property.address.state}
                </Card.Text>
                <div className="mt-auto">
                  <h5 className="text-primary">
                    ${property.price.toLocaleString()}
                  </h5>
                  <div className="d-flex justify-content-between text-muted mb-3">
                    <span>{property.bedrooms} Beds</span>
                    <span>{property.bathrooms} Baths</span>
                    <span>{property.squareFeet} sqft</span>
                  </div>
                  <Link
                    to={`/properties/${property._id}`}
                    className="btn btn-primary w-100"
                  >
                    View Details
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default PropertyList;

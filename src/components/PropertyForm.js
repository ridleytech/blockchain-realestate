import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const PropertyForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === "new" || location.pathname === "/properties/new";
  console.log("isNew:", isNew, "id:", id, "pathname:", location.pathname); // Debug log
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    totalShares: 1000,
    sharePrice: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    yearBuilt: "",
    features: [],
    images: [],
  });

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Calculate price per share whenever price or totalShares changes
  useEffect(() => {
    const price = parseFloat(formData.price) || 0;
    const totalShares = parseInt(formData.totalShares, 10) || 1; // Avoid division by zero
    const calculatedSharePrice = price / totalShares;

    setFormData((prev) => ({
      ...prev,
      sharePrice: calculatedSharePrice.toFixed(2), // Format to 2 decimal places
    }));
  }, [formData.price, formData.totalShares]);

  // Load property data if editing
  useEffect(() => {
    if (!isNew && id) {
      // Only fetch if we have a valid ID and it's not 'new'
      const fetchProperty = async () => {
        try {
          const response = await axios.get(
            `http://localhost:4000/api/properties/${id}`
          );
          const property = response.data.data || response.data;
          setFormData((prev) => ({
            ...prev,
            ...property,
            price: property.price?.toString() || "",
            sharePrice: property.sharePrice?.toString() || "",
            totalShares: property.totalShares?.toString() || "1000",
            address: {
              street: property.address?.street || "",
              city: property.address?.city || "",
              state: property.address?.state || "",
              zipCode: property.address?.zipCode || "",
              country: property.address?.country || "USA",
            },
            features: property.features || [],
          }));
        } catch (err) {
          setError("Failed to load property data");
          console.error("Error fetching property:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    } else {
      // If it's a new property, we don't need to fetch anything
      setLoading(false);
    }
  }, [id, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      // In a real app, you would upload to a file storage service
      // For now, we'll just create object URLs for preview
      const newPreviewImages = files.map((file) => URL.createObjectURL(file));
      setPreviewImages((prev) => [...prev, ...newPreviewImages]);

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In a real app, you would get the uploaded image URLs here
      const uploadedImages = files.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedImages],
      }));
    } catch (err) {
      setError("Error uploading images");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const method = isNew ? "post" : "put";
      const url = isNew
        ? "http://localhost:4000/api/properties"
        : `http://localhost:4000/api/properties/${id}`;
      const action = isNew ? "create" : "update";

      const response = await axios[method](
        url,
        {
          ...formData,
          price: parseFloat(formData.price) || 0,
          sharePrice: parseFloat(formData.sharePrice) || 0,
          totalShares: parseInt(formData.totalShares, 10) || 1000,
          lister: currentUser.id,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      setSuccess(
        isNew
          ? "Property listed successfully! Redirecting to property page..."
          : "Property updated successfully!"
      );

      // Redirect to property detail page after successful creation
      if (isNew) {
        setTimeout(() => {
          navigate(
            `/properties/${response.data.data._id || response.data._id}`
          );
        }, 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to save property";
      setError(errorMsg);
      console.error("Error saving property:", err);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header as="h4">
              {isNew ? "Add New Property" : "Edit Property"}
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <h5 className="mb-3">Basic Information</h5>
                <Row className="mb-3">
                  <Col md={8}>
                    <Form.Group controlId="title">
                      <Form.Label>Property Title *</Form.Label>
                      <Form.Control
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="E.g., Beautiful Downtown Apartment"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="price">
                      <Form.Label>Price ($) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="description">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="Describe the property in detail..."
                  />
                </Form.Group>

                <h5 className="mb-3 mt-4">Property Details</h5>
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group controlId="bedrooms">
                      <Form.Label>Bedrooms</Form.Label>
                      <Form.Control
                        type="number"
                        name="bedrooms"
                        value={formData.bedrooms}
                        onChange={handleChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="bathrooms">
                      <Form.Label>Bathrooms</Form.Label>
                      <Form.Control
                        type="number"
                        name="bathrooms"
                        value={formData.bathrooms}
                        onChange={handleChange}
                        min="0"
                        step="0.5"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="squareFeet">
                      <Form.Label>Area (sq ft)</Form.Label>
                      <Form.Control
                        type="number"
                        name="squareFeet"
                        value={formData.squareFeet}
                        onChange={handleChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mb-3 mt-4">Address</h5>
                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group controlId="street">
                      <Form.Label>Street Address *</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="city">
                      <Form.Label>City *</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="state">
                      <Form.Label>State *</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="zipCode">
                      <Form.Label>ZIP Code *</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mb-3 mt-4">Fractional Ownership</h5>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group controlId="totalShares">
                      <Form.Label>Total Shares *</Form.Label>
                      <Form.Control
                        type="number"
                        name="totalShares"
                        value={formData.totalShares}
                        onChange={handleChange}
                        min="1"
                        required
                      />
                      <Form.Text className="text-muted">
                        Total number of shares to divide the property into
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="sharePrice">
                      <Form.Label>Price per Share ($) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="sharePrice"
                        value={formData.sharePrice || "0.00"}
                        readOnly
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Automatically calculated (Total Price ÷ Total Shares)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mb-3 mt-4">Photos</h5>
                <Form.Group className="mb-3">
                  <Form.Label>Upload Property Images</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="mt-2">
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Uploading images...
                    </div>
                  )}
                </Form.Group>

                {/* Image preview */}
                {previewImages.length > 0 && (
                  <div className="mb-3">
                    <h6>Image Previews:</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {previewImages.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-between mt-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={uploading}
                    className="d-flex align-items-center"
                  >
                    {uploading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        {isNew ? "Creating..." : "Updating..."}
                      </>
                    ) : (
                      <>
                        <i
                          className={`fas ${
                            isNew ? "fa-plus" : "fa-save"
                          } me-2`}
                        ></i>
                        {isNew ? "List Property" : "Save Changes"}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PropertyForm;

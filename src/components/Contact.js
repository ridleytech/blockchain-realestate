import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPaperPlane,
} from "react-icons/fa";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log("Form submitted:", formData);
    setSubmitStatus("success");
    // Reset form
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  };

  return (
    <section className="py-5 bg-light">
      <Container>
        <div className="text-center mb-5">
          <h2 className="display-4 fw-bold mb-3">Contact Us</h2>
          <p className="lead text-muted">
            Have questions? We're here to help. Reach out to our team for any
            inquiries.
          </p>
        </div>

        <Row className="g-4">
          <Col lg={5} className="mb-4">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="p-4">
                <h3 className="h4 mb-4">Get in Touch</h3>

                <div className="d-flex mb-4">
                  <div className="me-3 text-primary">
                    <FaEnvelope size={24} />
                  </div>
                  <div>
                    <h5 className="h6 mb-1">Email Us</h5>
                    <a
                      href="mailto:tokenize@ridleytechnologies.com"
                      className="text-decoration-none"
                    >
                      tokenize@ridleytechnologies.com
                    </a>
                  </div>
                </div>

                <div className="d-flex mb-4">
                  <div className="me-3 text-primary">
                    <FaPhone size={24} />
                  </div>
                  <div>
                    <h5 className="h6 mb-1">Call Us</h5>
                    <a href="tel:7348901810" className="text-decoration-none">
                      (734) 890-1810
                    </a>
                  </div>
                </div>

                {/* <div className="d-flex">
                  <div className="me-3 text-primary">
                    <FaMapMarkerAlt size={24} />
                  </div>
                  <div>
                    <h5 className="h6 mb-1">Location</h5>
                    <p className="mb-0">Ann Arbor, MI</p>
                  </div>
                </div> */}

                <div className="mt-5">
                  <h4 className="h5 mb-3">Business Hours</h4>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM EST
                    </li>
                    <li className="mb-2">
                      <strong>Saturday:</strong> 10:00 AM - 4:00 PM EST
                    </li>
                    <li>
                      <strong>Sunday:</strong> Closed
                    </li>
                  </ul>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h3 className="h4 mb-4">Send Us a Message</h3>

                {submitStatus === "success" && (
                  <Alert
                    variant="success"
                    onClose={() => setSubmitStatus(null)}
                    dismissible
                  >
                    Thank you for your message! We'll get back to you soon.
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="formName">
                        <Form.Label>Your Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="formEmail">
                        <Form.Label>Email Address *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="formSubject">
                        <Form.Label>Subject *</Form.Label>
                        <Form.Control
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="formMessage">
                        <Form.Label>Your Message *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={5}
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} className="text-end">
                      <Button variant="primary" type="submit">
                        <FaPaperPlane className="me-2" />
                        Send Message
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="mt-5">
          <div className="bg-white p-4 rounded-3 shadow-sm">
            <h3 className="h4 mb-4">Frequently Asked Questions</h3>
            <div className="accordion" id="faqAccordion">
              <div className="accordion-item border-0 mb-3">
                <h2 className="accordion-header" id="headingOne">
                  <button
                    className="accordion-button"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseOne"
                    aria-expanded="true"
                    aria-controls="collapseOne"
                  >
                    How does fractional real estate investing work?
                  </button>
                </h2>
                <div
                  id="collapseOne"
                  className="accordion-collapse collapse show"
                  aria-labelledby="headingOne"
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body">
                    Fractional real estate investing allows multiple investors
                    to purchase shares of a property. Each share represents a
                    proportional ownership stake, and investors earn returns
                    through rental income and property appreciation.
                  </div>
                </div>
              </div>
              <div className="accordion-item border-0 mb-3">
                <h2 className="accordion-header" id="headingTwo">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseTwo"
                    aria-expanded="false"
                    aria-controls="collapseTwo"
                  >
                    What is the minimum investment amount?
                  </button>
                </h2>
                <div
                  id="collapseTwo"
                  className="accordion-collapse collapse"
                  aria-labelledby="headingTwo"
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body">
                    You can start investing with as little as $100, making real
                    estate investment accessible to everyone.
                  </div>
                </div>
              </div>
              <div className="accordion-item border-0">
                <h2 className="accordion-header" id="headingThree">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#collapseThree"
                    aria-expanded="false"
                    aria-controls="collapseThree"
                  >
                    How do I get started?
                  </button>
                </h2>
                <div
                  id="collapseThree"
                  className="accordion-collapse collapse"
                  aria-labelledby="headingThree"
                  data-bs-parent="#faqAccordion"
                >
                  <div className="accordion-body">
                    Getting started is easy! Simply create an account, complete
                    the verification process, connect your wallet, and you can
                    start browsing and investing in properties immediately.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Contact;

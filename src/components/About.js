import React from "react";
import { Container, Row, Col, Card, ListGroup } from "react-bootstrap";
import {
  FaBuilding,
  FaShieldAlt,
  FaChartLine,
  FaUsers,
  FaGlobe,
} from "react-icons/fa";
import TeamMember from "./TeamMember";

const About = () => {
  const features = [
    {
      icon: <FaBuilding className="display-4 text-primary mb-3" />,
      title: "Fractional Ownership",
      description:
        "Own a piece of premium real estate with investments starting as low as $100.",
    },
    {
      icon: <FaShieldAlt className="display-4 text-primary mb-3" />,
      title: "Blockchain Security",
      description:
        "Every transaction is recorded on the blockchain, ensuring transparency and security.",
    },
    {
      icon: <FaChartLine className="display-4 text-primary mb-3" />,
      title: "Real Returns",
      description:
        "Earn passive income through rental yields and property appreciation.",
    },
    {
      icon: <FaUsers className="display-4 text-primary mb-3" />,
      title: "Community Driven",
      description:
        "Join a community of like-minded investors building wealth together.",
    },
    {
      icon: <FaGlobe className="display-4 text-primary mb-3" />,
      title: "Global Access",
      description:
        "Invest in properties across different markets without geographical limitations.",
    },
  ];

  const stats = [
    { value: "$50M+", label: "Total Property Value" },
    { value: "5,000+", label: "Active Investors" },
    { value: "50+", label: "Properties Listed" },
    { value: "98%", label: "Investor Satisfaction" },
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-4 mb-lg-0">
              <h1 className="display-4 fw-bold mb-4">
                Revolutionizing Real Estate Investment
              </h1>
              <p className="lead mb-4">
                We're democratizing access to premium real estate investments
                through blockchain technology, making it possible for anyone to
                build wealth through property ownership.
              </p>
              <div className="d-flex gap-3">
                <a href="/properties" className="btn btn-light btn-lg px-4">
                  Browse Properties
                </a>
                <a
                  href="/how-it-works"
                  className="btn btn-outline-light btn-lg px-4"
                >
                  How It Works
                </a>
              </div>
            </Col>
            <Col lg={6}>
              <div className="p-4 bg-white rounded-3">
                <img
                  src="/assets/web-screenshot.png"
                  alt="Blockchain Real Estate Platform"
                  className="img-fluid rounded-3 shadow"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Our Story */}
      <section className="py-5">
        <Container>
          <Row className="justify-content-center">
            <Col lg={10} className="text-center">
              <h2 className="display-5 fw-bold mb-4">Our Story</h2>
              <p className="lead text-muted mb-5">
                Founded in 2023, Ridley Technologies was born from a simple
                idea: real estate investment should be accessible to everyone,
                not just the wealthy few. Our platform leverages blockchain
                technology to break down barriers and create new opportunities
                for wealth generation.
              </p>
              <div className="d-flex justify-content-center gap-4 flex-wrap">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center px-4">
                    <div className="display-6 fw-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="text-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Our Mission */}
      <section className="py-5 bg-light">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-4 mb-lg-0">
              <h2 className="display-5 fw-bold mb-4">Our Mission</h2>
              <p className="lead">
                To democratize access to real estate investment through
                innovative technology, creating a more inclusive financial
                future for all.
              </p>
              <p>
                We believe that everyone should have the opportunity to build
                generational wealth through real estate. By leveraging
                blockchain technology, we're making this vision a reality by
                removing traditional barriers to entry and creating a
                transparent, efficient marketplace for property investment.
              </p>
              <div className="mt-4">
                <h5 className="mb-3">Our Values</h5>
                <ListGroup variant="flush">
                  <ListGroup.Item className="border-0 ps-0">
                    <strong>Transparency:</strong> Open and honest in all our
                    dealings
                  </ListGroup.Item>
                  <ListGroup.Item className="border-0 ps-0">
                    <strong>Innovation:</strong> Continuously improving our
                    platform
                  </ListGroup.Item>
                  <ListGroup.Item className="border-0 ps-0">
                    <strong>Inclusivity:</strong> Making real estate investment
                    accessible to all
                  </ListGroup.Item>
                  <ListGroup.Item className="border-0 ps-0">
                    <strong>Security:</strong> Protecting our investors' assets
                    and data
                  </ListGroup.Item>
                </ListGroup>
              </div>
            </Col>
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Img
                  variant="top"
                  src="/assets/team-meeting.jpg"
                  alt="Our Team"
                  className="img-fluid"
                  style={{ height: "300px", objectFit: "cover" }}
                />
                <Card.Body>
                  <Card.Title className="h4">
                    Join Our Growing Community
                  </Card.Title>
                  <Card.Text>
                    Become part of a community that's reshaping the future of
                    real estate investment. Whether you're a first-time investor
                    or a seasoned pro, we have opportunities for you.
                  </Card.Text>
                  <a href="/register" className="btn btn-primary">
                    Get Started
                  </a>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features */}
      <section className="py-5">
        <Container>
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">Why Choose Us</h2>
            <p className="lead text-muted">
              We're building the future of real estate investment
            </p>
          </div>
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col key={index} md={6} lg={4}>
                <Card className="h-100 border-0 shadow-sm hover-lift">
                  <Card.Body className="text-center p-4">
                    <div className="mb-3">{feature.icon}</div>
                    <h4 className="h5 mb-3">{feature.title}</h4>
                    <p className="text-muted mb-0">{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-primary text-white">
        <Container className="text-center py-5">
          <h2 className="display-5 fw-bold mb-4">Ready to Start Investing?</h2>
          <p className="lead mb-4">
            Join thousands of investors who are already building wealth through
            our platform.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <a href="/register" className="btn btn-light btn-lg px-4">
              Get Started
            </a>
            <a href="/contact" className="btn btn-outline-light btn-lg px-4">
              Contact Us
            </a>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default About;

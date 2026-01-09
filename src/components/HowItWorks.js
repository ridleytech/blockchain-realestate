import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import {
  FaSearch,
  FaEthereum,
  FaWallet,
  FaChartLine,
  FaShieldAlt,
} from "react-icons/fa";

const HowItWorks = () => {
  const steps = [
    {
      icon: <FaSearch className="display-4 text-primary mb-3" />,
      title: "1. Browse Properties",
      description:
        "Explore our curated selection of premium real estate properties. Each property is tokenized, allowing you to own a fraction of the asset.",
    },
    {
      icon: <FaWallet className="display-4 text-primary mb-3" />,
      title: "2. Connect Your Wallet",
      description:
        "Connect your Web3 wallet (like MetaMask) to the platform to start investing. No lengthy paperwork or intermediaries required.",
    },
    {
      icon: <FaEthereum className="display-4 text-primary mb-3" />,
      title: "3. Purchase Shares",
      description:
        "Buy shares of your chosen property using cryptocurrency. Each share represents a proportional ownership stake in the property.",
    },
    {
      icon: <FaChartLine className="display-4 text-primary mb-3" />,
      title: "4. Earn Returns",
      description:
        "Earn rental income and benefit from property appreciation. Track your investments and returns in real-time through your dashboard.",
    },
    {
      icon: <FaShieldAlt className="display-4 text-primary mb-3" />,
      title: "5. Secure & Transparent",
      description:
        "All transactions are recorded on the blockchain, ensuring complete transparency and security of your investments.",
    },
  ];

  return (
    <section className="py-5 bg-light">
      <Container>
        <div className="text-center mb-5">
          <h2 className="display-4 fw-bold mb-3">How It Works</h2>
          <p className="lead text-muted">
            Fractional real estate investing made simple, secure, and accessible
            to everyone.
          </p>
        </div>

        <Row className="g-4">
          {steps.map((step, index) => (
            <Col key={index} lg={4} md={6} className="mb-4">
              <Card className="h-100 border-0 shadow-sm hover-lift">
                <Card.Body className="text-center p-4">
                  <div className="mb-3">{step.icon}</div>
                  <h4 className="h5 mb-3">{step.title}</h4>
                  <p className="text-muted mb-0">{step.description}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="text-center mt-5">
          <h3 className="h4 mb-4">Why Choose Our Platform?</h3>
          <Row className="justify-content-center g-4">
            <Col md={4}>
              <div className="p-4 bg-white rounded-3 shadow-sm h-100">
                <h5 className="mb-3">Low Minimum Investment</h5>
                <p className="text-muted mb-0">
                  Start with as little as $100 and build a diversified real
                  estate portfolio.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-4 bg-white rounded-3 shadow-sm h-100">
                <h5 className="mb-3">Global Access</h5>
                <p className="text-muted mb-0">
                  Invest in premium properties from anywhere in the world, 24/7.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-4 bg-white rounded-3 shadow-sm h-100">
                <h5 className="mb-3">Liquidity</h5>
                <p className="text-muted mb-0">
                  Trade your property shares on our secondary market for
                  increased flexibility.
                </p>
              </div>
            </Col>
          </Row>
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;

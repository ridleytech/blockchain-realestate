import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

// Components
import Navbar from "./components/Navbar";
import PropertyList from "./components/PropertyList";
import PropertyDetail from "./components/PropertyDetail";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-grow-1">
          <Container className="py-4">
            <Routes>
              <Route path="/" element={<PropertyList />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              {/* Add more routes as needed */}
            </Routes>
          </Container>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

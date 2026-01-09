import React from "react";
import { Card, Button } from "react-bootstrap";
import { FaLinkedin, FaTwitter, FaGithub } from "react-icons/fa";

const TeamMember = ({ name, role, image, bio, social }) => {
  return (
    <Card className="h-100 border-0 shadow-sm hover-lift">
      <div className="position-relative">
        <Card.Img
          variant="top"
          src={image || "/assets/team-placeholder.jpg"}
          alt={name}
          className="img-fluid"
          style={{ height: "300px", objectFit: "cover" }}
        />
        <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-dark bg-opacity-75 text-white">
          <h5 className="mb-0">{name}</h5>
          <p className="mb-0 text-muted">{role}</p>
        </div>
      </div>
      <Card.Body>
        <Card.Text className="text-muted">{bio}</Card.Text>
        <div className="d-flex gap-2">
          {social?.linkedin && (
            <a
              href={social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              <FaLinkedin size={20} />
            </a>
          )}
          {social?.twitter && (
            <a
              href={social.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              <FaTwitter size={20} />
            </a>
          )}
          {social?.github && (
            <a
              href={social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              <FaGithub size={20} />
            </a>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default TeamMember;

// API endpoint for courses data
// This module provides handlers to return the list of courses.

import { coursesData } from "../../src/data/coursesData.js";

/**
 * Express-like handler to get all courses.
 * @param {Object} req - Request object (unused).
 * @param {Object} res - Response object with json method.
 */
export const getCourses = (req, res) => {
  // Return the full courses catalog as JSON
  res.json({ success: true, count: coursesData.length, data: coursesData });
};

/**
 * Handler to get a single course by slug or id.
 * Accepts a route param `identifier` which can be id or slug.
 */
export const getCourse = (req, res) => {
  const { identifier } = req.params; // could be id or slug
  const course = coursesData.find(c =>
    c.slug === identifier || String(c.id) === String(identifier)
  );
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }
  res.json({ success: true, data: course });
};

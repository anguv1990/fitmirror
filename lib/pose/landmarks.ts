/**
 * MediaPipe Pose Landmarker landmark indices.
 *
 * ⚠️ COMPLIANCE RULE (docs/03-compliance-uk.md §1): this project uses **pose**
 * landmarks only. It must never extract facial features into a biometric
 * template — doing so would convert the processing into biometric data under UK
 * GDPR and pull it into the Article 9 special-category regime.
 *
 * The eye and ear landmarks below are used **solely as a vertical scale
 * reference** (how far down the image the head sits). They are geometric
 * coordinates, never a face descriptor, never stored, never compared between
 * people.
 */
export const POSE = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
} as const;

/** A single normalised landmark. x/y are 0-1 fractions of image width/height. */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  /** MediaPipe's confidence that the point is present and not occluded. */
  visibility?: number;
}

/** Landmarks required before any measurement is attempted. */
export const REQUIRED_LANDMARKS = [
  POSE.LEFT_SHOULDER,
  POSE.RIGHT_SHOULDER,
  POSE.LEFT_HIP,
  POSE.RIGHT_HIP,
] as const;

/** Additional landmarks needed to establish vertical scale. */
export const SCALE_LANDMARKS = {
  top: [POSE.LEFT_EYE, POSE.RIGHT_EYE, POSE.LEFT_EAR, POSE.RIGHT_EAR],
  bottom: [POSE.LEFT_HEEL, POSE.RIGHT_HEEL, POSE.LEFT_ANKLE, POSE.RIGHT_ANKLE],
} as const;

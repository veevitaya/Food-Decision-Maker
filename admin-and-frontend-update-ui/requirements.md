## Packages
framer-motion | Essential for the Tinder-style swipe cards, draggable bottom drawer, and Airbnb-style fluid animations
@use-gesture/react | Helps with complex drag gestures for the swipe deck and bottom sheet (makes the interaction feel native and premium)

## Notes
- We use a static placeholder map image from Unsplash for the background since no mapping API key is provided, but it's styled to feel like a modern map layer.
- Ensure the backend seeds enough restaurants for the swipe deck to feel populated (at least 5-10 items).
- The 'Because you liked Pad Thai' suggestion string is hardcoded for the UI mockup, but the data is fetched dynamically.

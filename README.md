# LocalLens

Your AR guide for local restaurants.

<img src="./assets/locallens.gif" alt="crop" width="500" />

## Overview

Thi project shows how to identify local restaurants using hand gestures and AI-powered visual recognition on Spectacles.

## Key Features

LocalLens uses hand gesture recognition to capture restaurant images and identify them using AI. When you pinch with your right hand, the lens:

- Captures the current camera view
- Retrieves your GPS location
- Sends the image and coordinates to the restaurant identification API
- Displays restaurant information (name, rating, and AI-generated summary) in an AR panel

The project integrates with a backend API that uses Google Gemini Vision for visual recognition and Google Places API for restaurant data. The `handMouseScript.ts` component handles hand gesture detection, image capture, location retrieval, and API communication. The `RestaurantInfoDisplay.ts` component manages the AR UI for displaying restaurant information.


API Docs: https://restaurant-api-xztpop2o2q-lz.a.run.app/docs/

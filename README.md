# Belize Parcel Locator
An unofficial tool designed to help land owners identify and locate land parcels in Belize. This web application reads parcel map data and allows users to visualize the location directly on Google Maps.

## How to Use

Visit the live site: https://bzlandlocator.pages.dev/

Upload a photo of your parcel map that the government provides.

The application extracts the visible grid coordinates and displays the location on Google Maps.

## Technologies Used

Frontend: It is a one-page application using HTML, CSS, and Javascript.

Mapping: Google Maps API

Hosting: Netlify

Backend: Upstash.com and Netlify

## Disclaimer

This is an unofficial, privately maintained tool — not affiliated with, endorsed by, or connected to the Government of Belize, the Lands & Survey Department, or any official registry. Always verify against official parcel records before any legal or financial decision.

## About Accuracy

Coordinate reading is done by an AI model and can occasionally misread numbers that are blurry, cropped, or at an unusual angle. If the converted position falls outside Belize the tool will warn you, which usually means the plan uses a different grid system.

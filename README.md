# Hapo Radio - Music Management Platform

## Overview

Hapo Radio is a comprehensive music management and radio scheduling platform designed for businesses. It allows users to manage music playlists, schedule radio content, and control music playback across multiple store locations.

## Features

*   **Authentication System:** Secure user login and registration using Supabase Auth.
*   **Music Library Management:**
    *   Upload and manage music tracks.
    *   Create and organize playlists.
    *   Manage track metadata (artist, genre, release year).
    *   Advanced search and filtering capabilities.
    *   Drag-and-drop playlist organization.
*   **Commercial Management:**
    *   Upload and manage commercial audio files.
    *   Create ad schedules with specific timing.
    *   Assign commercials to schedules.
*   **Store Management:**
    *   Multi-store support.
    *   Store-specific playlist assignment.
    *   Geographic location tracking.
    *   Status monitoring (online/offline).
    *   Payment status tracking.
*   **Analytics & Reporting:**
    *   Track play history.
    *   Store performance metrics.
    *   Listener engagement statistics.
    *   Search analytics.
*   **Audio Playback:**
    *   Global audio player with queue management.
    *   Crossfade support.
    *   Playlist continuity.
*   **Radio Scheduling:**
    *   Build custom radio queues.
    *   Schedule music segments with specific rules.
    *   Configure ad breaks and emergency overrides.
    *   Set dayparting rules for content scheduling.
    *   Real-time conflict detection and validation.
*   **Subscriber Management:**
    *   User subscription tracking.
    *   Listening statistics.
    *   Content engagement metrics.
*   **Remote Control:**
    *   Real-time control of store playback.
    *   Emergency broadcast system.
    *   Remote status monitoring.
*   **Advanced Analytics:**
    *   AI-powered recommendations.
    *   Predictive analytics for content performance.
    *   Custom reporting dashboards.

## Tech Stack

### Frontend

*   **React 18** - UI framework
*   **TypeScript** - Type safety and developer experience
*   **Vite** - Build tool and development server
*   **TailwindCSS** - Utility-first CSS framework
*   **Framer Motion** - Animations
*   **React Router** - Client-side routing
*   **Zustand** - State management
*   **React Beautiful DND** - Drag and drop functionality
*   **Headless UI** - Accessible UI components
*   **React Hot Toast** - Toast notifications
*   **Recharts** - Data visualization
*   **Date-fns** - Date manipulation
*   **Howler.js** - Audio playback

### Backend & Database

*   **Supabase** - Backend as a Service
    *   PostgreSQL database
    *   Authentication
    *   Real-time subscriptions
    *   Row Level Security
    *   Storage for audio files and images

### Development Tools

*   **ESLint** - Code linting
*   **TypeScript ESLint** - TypeScript-specific linting
*   **Jest** - Testing framework
*   **React Testing Library** - Component testing
*   **Playwright** - End-to-end testing

## Database Schema

### Core Tables

*   `stores` - Store information and status
*   `tracks` - Music track metadata
*   `playlists` - Playlist management
*   `playlist_tracks` - Track organization within playlists
*   `schedules` - Playlist scheduling

### Analytics Tables

*   `track_plays` - Track play history
*   `store_audit_logs` - Store operation logs
*   `search_analytics` - Search behavior tracking
*   `store_analytics` - Store performance metrics
*   `playlist_analytics` - Playlist performance metrics

### Scheduling Tables

*   `playlist_segments` - Playlist segment organization
*   `ad_breaks` - Advertisement scheduling
*   `schedule_patterns` - Recurring schedule patterns
*   `emergency_overrides` - Emergency broadcast management

### User Management Tables

*   `profiles` - User profile information
*   `subscribers` - Subscription management
*   `content_engagement` - User interaction tracking

## Security Features

*   Row Level Security (RLS) on all tables
*   Secure file uploads with size and type restrictions
*   User authentication and authorization
*   Secure environment variable handling
*   Data validation and sanitization

## Deployment

The application is deployed on Netlify.

## Contributing

Please follow the standard pull request process.

## License

This project is private and confidential. All rights reserved.

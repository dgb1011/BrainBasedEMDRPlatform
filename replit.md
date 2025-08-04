# BrainBased EMDR Consultation Tracking System

## Overview

This is a comprehensive EMDR (Eye Movement Desensitization and Reprocessing) consultation tracking system designed to streamline the certification process for EMDR practitioners. The platform provides integrated video conferencing, automated scheduling, progress tracking, and certification management in a single unified application.

The system serves students pursuing EMDR certification, consultants providing supervision, and administrators managing the program. It aims to transform the traditional 40-hour certification journey by reducing administrative overhead and providing a Netflix-quality user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with role-based access control
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with Tailwind CSS for styling
- **Design System**: Shadcn/ui component library with customizable themes

The frontend follows a component-based architecture with separate pages for Dashboard, Schedule, VideoSession, and Landing. Custom hooks manage authentication state and WebSocket connections for real-time features.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: OpenID Connect integration with Replit Auth
- **API Design**: RESTful endpoints with role-based access control
- **Real-time Communication**: WebSocket support for video conferencing features

The backend implements a service layer pattern with separate modules for storage operations, authentication middleware, and route handling.

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple

The database schema includes comprehensive tables for users, students, consultants, consultation sessions, video sessions, availability tracking, and document management.

### Authentication and Authorization
- **Provider**: Replit's OpenID Connect implementation
- **Session Management**: Secure HTTP-only cookies with PostgreSQL persistence
- **Role-based Access**: Three user types (student, consultant, admin) with appropriate permissions
- **Security**: CSRF protection and secure session configuration

### Video Conferencing Integration
- **WebRTC Implementation**: Custom video conferencing solution built on native WebRTC APIs
- **Real-time Messaging**: WebSocket-based signaling for peer connection establishment
- **Media Controls**: Audio/video toggle, screen sharing, and session recording capabilities
- **Room Management**: Unique room IDs tied to consultation sessions

## External Dependencies

### Database and Storage
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and query building
- **connect-pg-simple**: PostgreSQL-backed session storage

### Authentication Services
- **Replit OpenID Connect**: Identity provider integration for user authentication
- **Passport.js**: Authentication middleware with OpenID Connect strategy

### UI and Design
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **date-fns**: Date manipulation and formatting utilities

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

### Real-time Features
- **WebSocket (ws)**: Real-time communication for video sessions
- **WebRTC**: Peer-to-peer video and audio communication
- **TanStack Query**: Efficient data fetching with caching and synchronization
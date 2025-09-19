import React from 'react';
import { Navigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  console.log('🚫 404 - Redirecting to home');
  return <Navigate to="/" replace />;
};

export default NotFound;
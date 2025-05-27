import { Routes } from 'react-router-dom';
import { guestFormRoutes } from '@/features/guest-form/routes';

export function AppRoutes() {
  return <Routes>{guestFormRoutes}</Routes>;
}

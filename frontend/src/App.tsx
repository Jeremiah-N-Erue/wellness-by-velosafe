import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import ProviderDashboardPage from "./pages/ProviderDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import MessagesPage from "./pages/MessagesPage";
import ShopPage from "./pages/ShopPage";
import BookingPage from "./pages/BookingPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/providers/:id" element={<ProviderProfilePage />} />
            <Route
              path="/booking"
              element={
                <ProtectedRoute role="CLIENT">
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute role="CLIENT">
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="CLIENT">
                  <ClientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider"
              element={
                <ProtectedRoute role="PROVIDER">
                  <ProviderDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="ADMIN">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

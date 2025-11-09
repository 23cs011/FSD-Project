import React, { useState, useEffect, createContext, useContext, useMemo } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    Link,
    useNavigate,
    useLocation,
} from "react-router-dom";
import axios from "axios";

// API Configuration
const API_URL = "http://localhost:3000/api";
axios.defaults.baseURL = API_URL;

// Utility function for debouncing
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
};

// Auth Context
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common[
                "Authorization"
            ] = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    const login = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem("token", userToken);
        localStorage.setItem("user", JSON.stringify(userData));
        axios.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete axios.defaults.headers.common["Authorization"];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => useContext(AuthContext);

// Favorites Context
const FavoritesContext = createContext(null);

const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem("favorites");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("favorites", JSON.stringify(favorites));
    }, [favorites]);

    const addToFavorites = (medicine) => {
        setFavorites((prev) => {
            if (prev.some((item) => item._id === medicine._id)) {
                return prev;
            }
            return [...prev, medicine];
        });
    };

    const removeFromFavorites = (medicineId) => {
        setFavorites((prev) => prev.filter((item) => item._id !== medicineId));
    };

    const isFavorite = (medicineId) => {
        return favorites.some((item) => item._id === medicineId);
    };

    return (
        <FavoritesContext.Provider
            value={{ favorites, addToFavorites, removeFromFavorites, isFavorite }}
        >
            {children}
        </FavoritesContext.Provider>
    );
};

const useFavorites = () => useContext(FavoritesContext);

// Cart Context
const CartContext = createContext(null);

const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    const addToCart = (medicine, quantity = 1) => {
        setCart((prev) => {
            const existing = prev.find(
                (item) => item.medicine._id === medicine._id
            );
            if (existing) {
                return prev.map((item) =>
                    item.medicine._id === medicine._id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { medicine, quantity }];
        });
    };

    const removeFromCart = (medicineId) => {
        setCart((prev) =>
            prev.filter((item) => item.medicine._id !== medicineId)
        );
    };

    const updateQuantity = (medicineId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(medicineId);
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.medicine._id === medicineId
                        ? { ...item, quantity }
                        : item
                )
            );
        }
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce(
        (sum, item) => sum + item.medicine.price * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                total,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

const useCart = () => useContext(CartContext);

// Navbar Component
const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const { favorites } = useFavorites();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-2xl sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="bg-white p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                            <svg
                                className="w-6 h-6 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                />
                            </svg>
                        </div>
                        <span className="text-white text-xl font-bold tracking-wide">
                            MediCare
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {user ? (
                            <>
                                {user.role === "user" && (
                                    <>
                                        <Link
                                            to="/medicines"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 ${
                                                location.pathname === "/medicines"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Medicines
                                        </Link>
                                        <Link
                                            to="/favorites"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 relative ${
                                                location.pathname === "/favorites"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            <svg
                                                className="w-5 h-5 inline-block mr-1"
                                                fill={favorites.length > 0 ? "currentColor" : "none"}
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                                />
                                            </svg>
                                            Favorites
                                            {favorites.length > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                                                    {favorites.length}
                                                </span>
                                            )}
                                        </Link>
                                        <Link
                                            to="/orders"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 ${
                                                location.pathname === "/orders"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            My Orders
                                        </Link>
                                        <Link to="/cart" className="relative group">
                                            <svg
                                                className="w-6 h-6 text-white group-hover:text-blue-100 transition-all duration-200 group-hover:scale-110"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            {cart.length > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-bounce">
                                                    {cart.length}
                                                </span>
                                            )}
                                        </Link>
                                    </>
                                )}
                                {user.role === "admin" && (
                                    <>
                                        <Link
                                            to="/admin/dashboard"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 ${
                                                location.pathname === "/admin/dashboard"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/admin/medicines"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 ${
                                                location.pathname === "/admin/medicines"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Manage Medicines
                                        </Link>
                                        <Link
                                            to="/admin/orders"
                                            className={`text-white hover:text-blue-100 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-white/10 ${
                                                location.pathname === "/admin/orders"
                                                    ? "bg-white/20 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Manage Orders
                                        </Link>
                                    </>
                                )}
                                <div className="flex items-center space-x-3 pl-4 border-l border-white/20">
                                    <div className="text-white text-sm hidden lg:block">
                                        <div className="font-semibold">{user.name}</div>
                                        <div className="text-xs text-blue-100 capitalize">
                                            {user.role}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex space-x-3">
                                <Link
                                    to="/login"
                                    className="text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {mobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/20 animate-fade-in">
                        {user ? (
                            <div className="space-y-2">
                                {user.role === "user" && (
                                    <>
                                        <Link
                                            to="/medicines"
                                            className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Medicines
                                        </Link>
                                        <Link
                                            to="/favorites"
                                            className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Favorites ({favorites.length})
                                        </Link>
                                        <Link
                                            to="/orders"
                                            className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            My Orders
                                        </Link>
                                        <Link
                                            to="/cart"
                                            className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Cart ({cart.length})
                                        </Link>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full text-left text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Link
                                    to="/login"
                                    className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="block text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

// Login Page
const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post("/auth/login", {
                email,
                password,
            });
            login(response.data.user, response.data.token);

            if (response.data.user.role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/medicines");
            }
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-block bg-blue-100 p-3 rounded-full mb-4">
                            <svg
                                className="w-12 h-12 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            Welcome Back
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Sign in to your account
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                Register here
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500 text-center">
                            <strong>Demo Accounts:</strong>
                            <br />
                            Admin: admin@demo.com / admin123
                            <br />
                            User: user@demo.com / user123
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Register Page
const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post("/auth/register", formData);
            login(response.data.user, response.data.token);
            navigate("/medicines");
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-block bg-blue-100 p-3 rounded-full mb-4">
                            <svg
                                className="w-12 h-12 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            Create Account
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Join MediCare today
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows="2"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold disabled:opacity-50"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Medicines Page (User)
const MedicinesPage = () => {
    const [allMedicines, setAllMedicines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [loading, setLoading] = useState(true);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const { addToCart } = useCart();
    const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
    const [addedToCart, setAddedToCart] = useState({});
    
    const debouncedSearch = useDebounce(search, 300);

    // Fetch all medicines once on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [medicinesRes, categoriesRes] = await Promise.all([
                    axios.get("/medicines"),
                    axios.get("/categories")
                ]);
                setAllMedicines(medicinesRes.data);
                setCategories(categoriesRes.data);
                
                // Set initial price range based on actual data
                const prices = medicinesRes.data.map(m => m.price);
                if (prices.length > 0) {
                    setPriceRange([0, Math.max(...prices) + 100]);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Client-side filtering and sorting
    const filteredMedicines = useMemo(() => {
        let result = [...allMedicines];

        // Filter by search
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            result = result.filter(
                (med) =>
                    med.name.toLowerCase().includes(searchLower) ||
                    med.description.toLowerCase().includes(searchLower) ||
                    med.manufacturer.toLowerCase().includes(searchLower) ||
                    med.category.toLowerCase().includes(searchLower)
            );
        }

        // Filter by category
        if (category !== "all") {
            result = result.filter((med) => med.category === category);
        }

        // Filter by price range
        result = result.filter(
            (med) => med.price >= priceRange[0] && med.price <= priceRange[1]
        );

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "price-low":
                    return a.price - b.price;
                case "price-high":
                    return b.price - a.price;
                case "stock":
                    return b.stock - a.stock;
                default:
                    return 0;
            }
        });

        return result;
    }, [allMedicines, debouncedSearch, category, priceRange, sortBy]);

    // Search suggestions
    const suggestions = useMemo(() => {
        if (!search || search.length < 2) return [];
        
        const searchLower = search.toLowerCase();
        const matches = new Set();
        
        allMedicines.forEach(med => {
            if (med.name.toLowerCase().includes(searchLower)) {
                matches.add(med.name);
            }
            if (med.manufacturer.toLowerCase().includes(searchLower)) {
                matches.add(med.manufacturer);
            }
        });
        
        return Array.from(matches).slice(0, 5);
    }, [search, allMedicines]);

    const handleAddToCart = (medicine) => {
        addToCart(medicine);
        setAddedToCart({ ...addedToCart, [medicine._id]: true });
        setTimeout(() => {
            setAddedToCart({ ...addedToCart, [medicine._id]: false });
        }, 2000);
    };

    const toggleFavorite = (medicine, e) => {
        e.stopPropagation();
        if (isFavorite(medicine._id)) {
            removeFromFavorites(medicine._id);
        } else {
            addToFavorites(medicine);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50">
            <div className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 text-white py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-5xl font-bold mb-4 animate-fade-in">
                        Browse Medicines
                    </h1>
                    <p className="text-blue-100 text-lg">
                        Find the medicines you need, delivered to your doorstep
                    </p>
                    <div className="mt-6 flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Fast Delivery</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Secure Payment</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Quality Assured</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🔍 Search Medicines
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="Search by name, manufacturer, category..."
                                className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <svg
                                className="w-5 h-5 text-gray-400 absolute left-3 top-11"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            
                            {/* Search Suggestions */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl">
                                    {suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSearch(suggestion);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition first:rounded-t-xl last:rounded-b-xl"
                                        >
                                            <span className="text-gray-700">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                📂 Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🔃 Sort By
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="name">Name (A-Z)</option>
                                <option value="price-low">Price (Low to High)</option>
                                <option value="price-high">Price (High to Low)</option>
                                <option value="stock">Stock Availability</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="font-semibold">
                                {filteredMedicines.length} medicine{filteredMedicines.length !== 1 ? 's' : ''} found
                            </span>
                            {(search || category !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setCategory("all");
                                        setSortBy("name");
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Clear Filters</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-gray-600 mt-6 text-lg font-medium">
                            Loading medicines...
                        </p>
                    </div>
                ) : filteredMedicines.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-xl">
                        <svg
                            className="w-24 h-24 text-gray-300 mx-auto mb-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p className="text-gray-600 text-xl font-medium mb-2">
                            No medicines found
                        </p>
                        <p className="text-gray-500">
                            Try adjusting your search or filters
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredMedicines.map((medicine) => (
                            <div
                                key={medicine._id}
                                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1"
                            >
                                <div className="relative h-48 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center group-hover:from-blue-100 group-hover:via-indigo-100 group-hover:to-purple-100 transition-all duration-300">
                                    <svg
                                        className="w-24 h-24 text-blue-400 group-hover:text-blue-500 transition-all duration-300 group-hover:scale-110"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                        />
                                    </svg>
                                    
                                    <button
                                        onClick={(e) => toggleFavorite(medicine, e)}
                                        className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 z-10"
                                    >
                                        <svg
                                            className={`w-5 h-5 ${
                                                isFavorite(medicine._id)
                                                    ? "text-red-500 fill-current"
                                                    : "text-gray-400"
                                            }`}
                                            fill={isFavorite(medicine._id) ? "currentColor" : "none"}
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
                                            {medicine.name}
                                        </h3>
                                        {medicine.requiresPrescription && (
                                            <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                                Rx
                                            </span>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 mb-2 font-medium">
                                        {medicine.manufacturer}
                                    </p>
                                    
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                                        {medicine.description}
                                    </p>

                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold">
                                            {medicine.category}
                                        </span>
                                        <span className="text-sm text-gray-600 flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <span className={medicine.stock > 10 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                {medicine.stock}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div>
                                            <span className="text-3xl font-bold text-blue-600">
                                                ₹{medicine.price}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleAddToCart(medicine)}
                                            disabled={medicine.stock === 0}
                                            className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                                                medicine.stock === 0
                                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                    : addedToCart[medicine._id]
                                                    ? "bg-green-500 text-white shadow-lg"
                                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                                            }`}
                                        >
                                            {medicine.stock === 0 ? (
                                                <span>Out of Stock</span>
                                            ) : addedToCart[medicine._id] ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>Added</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <span>Add to Cart</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Cart Page
const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, clearCart, total } =
        useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!deliveryAddress || !phone) {
            alert("Please provide delivery address and phone number");
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                items: cart.map((item) => ({
                    medicine: item.medicine._id,
                    quantity: item.quantity,
                    price: item.medicine.price,
                })),
                totalAmount: total,
                deliveryAddress,
                phone,
            };

            await axios.post("/orders", orderData);
            clearCart();
            alert("Order placed successfully! Payment on delivery.");
            navigate("/orders");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
                    <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            className="w-12 h-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        Your cart is empty
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Add some medicines to get started
                    </p>
                    <Link
                        to="/medicines"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Browse Medicines</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">
                        Shopping Cart
                    </h1>
                    <button
                        onClick={clearCart}
                        className="text-red-600 hover:text-red-700 font-medium flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Clear Cart</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item) => (
                            <div
                                key={item.medicine._id}
                                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:border-blue-200 transition-all duration-200"
                            >
                                <div className="flex items-start gap-6">
                                    <div className="w-28 h-28 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl flex items-center justify-center shrink-0">
                                        <svg
                                            className="w-14 h-14 text-blue-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                            {item.medicine.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-1">
                                            {item.medicine.manufacturer}
                                        </p>
                                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold mb-4">
                                            {item.medicine.category}
                                        </span>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.medicine._id,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    className="px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-600"
                                                >
                                                    −
                                                </button>
                                                <span className="px-6 py-2 font-bold text-gray-900 bg-gray-50">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.medicine._id,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                    disabled={
                                                        item.quantity >=
                                                        item.medicine.stock
                                                    }
                                                    className="px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    removeFromCart(
                                                        item.medicine._id
                                                    )
                                                }
                                                className="text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>Remove</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-blue-600 mb-1">
                                            ₹{item.medicine.price * item.quantity}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            ₹{item.medicine.price} × {item.quantity}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24 border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Order Summary
                            </h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        📍 Delivery Address
                                    </label>
                                    <textarea
                                        value={deliveryAddress}
                                        onChange={(e) =>
                                            setDeliveryAddress(e.target.value)
                                        }
                                        rows="3"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Enter delivery address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        📞 Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Enter phone number"
                                    />
                                </div>
                            </div>

                            <div className="border-t-2 border-gray-200 pt-6 space-y-3">
                                <div className="flex justify-between text-gray-700">
                                    <span className="font-medium">Subtotal ({cart.length} items)</span>
                                    <span className="font-semibold">₹{total}</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span className="font-medium">Delivery</span>
                                    <span className="text-green-600 font-bold">
                                        FREE
                                    </span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t-2 border-gray-200">
                                    <span>Total</span>
                                    <span className="text-blue-600">₹{total}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={loading || !deliveryAddress || !phone}
                                className="w-full mt-6 bg-linear-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                {loading
                                    ? "Processing..."
                                    : "💳 Place Order (Cash on Delivery)"}
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Payment will be collected at delivery</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Favorites Page
const FavoritesPage = () => {
    const { favorites, removeFromFavorites } = useFavorites();
    const { addToCart } = useCart();
    const [addedToCart, setAddedToCart] = useState({});
    const navigate = useNavigate();

    const handleAddToCart = (medicine) => {
        addToCart(medicine);
        setAddedToCart({ ...addedToCart, [medicine._id]: true });
        setTimeout(() => {
            setAddedToCart(prev => ({ ...prev, [medicine._id]: false }));
        }, 2000);
    };

    if (favorites.length === 0) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
                    <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            className="w-12 h-12 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        No favorites yet
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Start adding medicines to your favorites list
                    </p>
                    <button
                        onClick={() => navigate("/medicines")}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Browse Medicines</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            ❤️ My Favorites
                        </h1>
                        <p className="text-gray-600">
                            {favorites.length} medicine{favorites.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favorites.map((medicine) => (
                        <div
                            key={medicine._id}
                            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1"
                        >
                            <div className="relative h-48 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                                <svg
                                    className="w-24 h-24 text-blue-400 group-hover:text-blue-500 transition-all"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                    />
                                </svg>
                                
                                <button
                                    onClick={() => removeFromFavorites(medicine._id)}
                                    className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all"
                                >
                                    <svg
                                        className="w-5 h-5 text-red-500 fill-current"
                                        fill="currentColor"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                        />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
                                        {medicine.name}
                                    </h3>
                                    {medicine.requiresPrescription && (
                                        <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                            Rx
                                        </span>
                                    )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2 font-medium">
                                    {medicine.manufacturer}
                                </p>
                                
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                                    {medicine.description}
                                </p>

                                <div className="flex items-center justify-between mb-4">
                                    <span className="inline-block bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold">
                                        {medicine.category}
                                    </span>
                                    <span className="text-sm text-gray-600 flex items-center space-x-1">
                                        <span className={medicine.stock > 10 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                            Stock: {medicine.stock}
                                        </span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div>
                                        <span className="text-3xl font-bold text-blue-600">
                                            ₹{medicine.price}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleAddToCart(medicine)}
                                        disabled={medicine.stock === 0}
                                        className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 ${
                                            medicine.stock === 0
                                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                : addedToCart[medicine._id]
                                                ? "bg-green-500 text-white shadow-lg"
                                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
                                        }`}
                                    >
                                        {medicine.stock === 0 ? (
                                            <span>Out of Stock</span>
                                        ) : addedToCart[medicine._id] ? (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Added</span>
                                            </>
                                        ) : (
                                            <span>Add to Cart</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Orders Page (User)
const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get("/orders");
            setOrders(response.data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?"))
            return;

        try {
            await axios.put(`/orders/${orderId}/status`, {
                status: "CANCELLED",
            });
            fetchOrders();
            alert("Order cancelled successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to cancel order");
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            PLACED: "bg-blue-100 text-blue-800",
            ACCEPTED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            "OUT FOR DELIVERY": "bg-purple-100 text-purple-800",
            DELIVERED: "bg-gray-100 text-gray-800",
            CANCELLED: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-6"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    📦 My Orders
                </h1>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
                        <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-12 h-12 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                            No orders yet
                        </h2>
                        <p className="text-gray-600 mb-8 text-lg">
                            Start shopping to place your first order
                        </p>
                        <Link
                            to="/medicines"
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Browse Medicines</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:border-blue-200 transition-all duration-200 hover:shadow-xl"
                            >
                                <div className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500 font-medium">Order ID</p>
                                            <p className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-lg inline-block">
                                                {order._id.slice(-8).toUpperCase()}
                                            </p>
                                            <p className="text-sm text-gray-600 flex items-center space-x-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>
                                                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </p>
                                        </div>
                                        <span
                                            className={`px-6 py-3 rounded-xl text-sm font-bold shadow-md ${getStatusColor(
                                                order.status
                                            )}`}
                                        >
                                            {order.status}
                                        </span>
                                    </div>

                                    {order.rejectionReason && (
                                        <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-start space-x-3">
                                            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <strong className="font-bold">Rejection Reason:</strong>
                                                <p className="mt-1">{order.rejectionReason}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t-2 border-gray-100 pt-6 mb-6">
                                        <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                            <span>Order Items</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-center bg-gray-50 p-4 rounded-xl hover:bg-gray-100 transition"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {item.medicine.name}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                Quantity: {item.quantity} × ₹{item.price}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-gray-900 text-lg">
                                                        ₹{item.price * item.quantity}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t-2 border-gray-100 pt-6 mb-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-blue-50 p-4 rounded-xl">
                                                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center space-x-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>Delivery Address</span>
                                                </p>
                                                <p className="font-medium text-gray-900">
                                                    {order.deliveryAddress}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-xl">
                                                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center space-x-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    <span>Contact Phone</span>
                                                </p>
                                                <p className="font-medium text-gray-900">{order.phone}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t-2 border-gray-100 gap-4">
                                        <div className="bg-linear-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-xl">
                                            <p className="text-sm text-gray-600 font-medium mb-1">
                                                Total Amount
                                            </p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                ₹{order.totalAmount}
                                            </p>
                                        </div>

                                        {order.status === "PLACED" && (
                                            <button
                                                onClick={() => cancelOrder(order._id)}
                                                className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                <span>Cancel Order</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Admin Dashboard
const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await axios.get("/admin/stats");
            setStats(response.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Admin Dashboard
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">
                                    Total Orders
                                </p>
                                <p className="text-4xl font-bold mt-2">
                                    {stats?.totalOrders || 0}
                                </p>
                            </div>
                            <svg
                                className="w-12 h-12 text-blue-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">
                                    Total Medicines
                                </p>
                                <p className="text-4xl font-bold mt-2">
                                    {stats?.totalMedicines || 0}
                                </p>
                            </div>
                            <svg
                                className="w-12 h-12 text-green-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">
                                    Total Users
                                </p>
                                <p className="text-4xl font-bold mt-2">
                                    {stats?.totalUsers || 0}
                                </p>
                            </div>
                            <svg
                                className="w-12 h-12 text-purple-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">
                                    Pending Orders
                                </p>
                                <p className="text-4xl font-bold mt-2">
                                    {stats?.pendingOrders || 0}
                                </p>
                            </div>
                            <svg
                                className="w-12 h-12 text-orange-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <Link
                                to="/admin/medicines"
                                className="block bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg transition font-medium"
                            >
                                Manage Medicines →
                            </Link>
                            <Link
                                to="/admin/orders"
                                className="block bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3 rounded-lg transition font-medium"
                            >
                                Manage Orders →
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            System Status
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                    Payment Method
                                </span>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    Cash on Delivery
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                    System Status
                                </span>
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ● Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Admin Medicines Management
const AdminMedicines = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
        price: "",
        stock: "",
        manufacturer: "",
        expiryDate: "",
        requiresPrescription: false,
    });

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const response = await axios.get("/medicines");
            setMedicines(response.data);
        } catch (err) {
            console.error("Error fetching medicines:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingMedicine) {
                await axios.put(`/medicines/${editingMedicine._id}`, formData);
                alert("Medicine updated successfully");
            } else {
                await axios.post("/medicines", formData);
                alert("Medicine created successfully");
            }
            setShowModal(false);
            setEditingMedicine(null);
            resetForm();
            fetchMedicines();
        } catch (err) {
            alert(err.response?.data?.error || "Operation failed");
        }
    };

    const handleEdit = (medicine) => {
        setEditingMedicine(medicine);
        setFormData({
            name: medicine.name,
            description: medicine.description,
            category: medicine.category,
            price: medicine.price,
            stock: medicine.stock,
            manufacturer: medicine.manufacturer,
            expiryDate: medicine.expiryDate.split("T")[0],
            requiresPrescription: medicine.requiresPrescription,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this medicine?"))
            return;

        try {
            await axios.delete(`/medicines/${id}`);
            alert("Medicine deleted successfully");
            fetchMedicines();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete medicine");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            category: "",
            price: "",
            stock: "",
            manufacturer: "",
            expiryDate: "",
            requiresPrescription: false,
        });
    };

    const openCreateModal = () => {
        setEditingMedicine(null);
        resetForm();
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Manage Medicines
                    </h1>
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Add Medicine
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Category
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Price
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Stock
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Manufacturer
                                        </th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {medicines.map((medicine) => (
                                        <tr
                                            key={medicine._id}
                                            className="hover:bg-gray-50 transition"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {medicine.name}
                                                    </p>
                                                    {medicine.requiresPrescription && (
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                            Rx
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {medicine.category}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-semibold">
                                                ₹{medicine.price}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        medicine.stock > 10
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                                >
                                                    {medicine.stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {medicine.manufacturer}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleEdit(medicine)
                                                        }
                                                        className="text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                medicine._id
                                                            )
                                                        }
                                                        className="text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {editingMedicine
                                        ? "Edit Medicine"
                                        : "Add New Medicine"}
                                </h2>

                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        name: e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Category
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.category}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        category:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Price (₹)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        price: e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Stock
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.stock}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        stock: e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Manufacturer
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.manufacturer}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        manufacturer:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Expiry Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.expiryDate}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        expiryDate:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows="3"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                formData.requiresPrescription
                                            }
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    requiresPrescription:
                                                        e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="ml-2 text-sm font-medium text-gray-700">
                                            Requires Prescription
                                        </label>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                                        >
                                            {editingMedicine
                                                ? "Update Medicine"
                                                : "Create Medicine"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowModal(false);
                                                setEditingMedicine(null);
                                                resetForm();
                                            }}
                                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Admin Orders Management
const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get("/orders");
            setOrders(response.data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status, reason = "") => {
        try {
            await axios.put(`/orders/${orderId}/status`, {
                status,
                rejectionReason: reason,
            });
            fetchOrders();
            setShowModal(false);
            setRejectionReason("");
            alert("Order status updated successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update order status");
        }
    };

    const handleReject = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const confirmReject = () => {
        if (!rejectionReason.trim()) {
            alert("Please provide a rejection reason");
            return;
        }
        updateOrderStatus(selectedOrder._id, "REJECTED", rejectionReason);
    };

    const getStatusColor = (status) => {
        const colors = {
            PLACED: "bg-blue-100 text-blue-800",
            ACCEPTED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            "OUT FOR DELIVERY": "bg-purple-100 text-purple-800",
            DELIVERED: "bg-gray-100 text-gray-800",
            CANCELLED: "bg-red-100 text-red-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Manage Orders
                </h1>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <p className="text-gray-600 text-lg">No orders found</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Order ID: {order._id}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Placed on:{" "}
                                                {new Date(
                                                    order.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                            <p className="font-medium text-gray-900 mt-2">
                                                Customer: {order.user.name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Email: {order.user.email}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Phone: {order.phone}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                                                order.status
                                            )}`}
                                        >
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="border-t pt-4 mb-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">
                                            Order Items
                                        </h3>
                                        <div className="space-y-2">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {item.medicine.name}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            Quantity:{" "}
                                                            {item.quantity} × ₹
                                                            {item.price}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold text-gray-900">
                                                        ₹
                                                        {item.price *
                                                            item.quantity}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 mb-4">
                                        <p className="text-sm text-gray-600">
                                            Delivery Address
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {order.deliveryAddress}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                Total Amount
                                            </p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                ₹{order.totalAmount}
                                            </p>
                                        </div>

                                        {order.status === "PLACED" && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() =>
                                                        updateOrderStatus(
                                                            order._id,
                                                            "ACCEPTED"
                                                        )
                                                    }
                                                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleReject(order)
                                                    }
                                                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}

                                        {order.status === "ACCEPTED" && (
                                            <button
                                                onClick={() =>
                                                    updateOrderStatus(
                                                        order._id,
                                                        "OUT FOR DELIVERY"
                                                    )
                                                }
                                                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                                            >
                                                Mark Out for Delivery
                                            </button>
                                        )}

                                        {order.status ===
                                            "OUT FOR DELIVERY" && (
                                            <button
                                                onClick={() =>
                                                    updateOrderStatus(
                                                        order._id,
                                                        "DELIVERED"
                                                    )
                                                }
                                                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition font-medium"
                                            >
                                                Mark as Delivered
                                            </button>
                                        )}
                                    </div>

                                    {order.rejectionReason && (
                                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                            <strong>Rejection Reason:</strong>{" "}
                                            {order.rejectionReason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Reject Order
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Please provide a reason for rejecting this
                                order:
                            </p>

                            <textarea
                                value={rejectionReason}
                                onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                }
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                                placeholder="Enter rejection reason..."
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={confirmReject}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold"
                                >
                                    Confirm Rejection
                                </button>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setRejectionReason("");
                                        setSelectedOrder(null);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Home Page
const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/medicines");
            }
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="text-center">
                    <div className="inline-block bg-white p-8 rounded-3xl shadow-2xl mb-10 transform hover:scale-105 transition-transform duration-300">
                        <svg
                            className="w-28 h-28 text-blue-600 mx-auto animate-pulse"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-7xl font-bold text-gray-900 mb-8 animate-fade-in">
                        Welcome to{" "}
                        <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            MediCare
                        </span>
                    </h1>

                    <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Your trusted online pharmacy. Order medicines from the
                        comfort of your home and get them delivered to your
                        doorstep with care.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 mb-20">
                        <Link
                            to="/register"
                            className="group relative inline-flex items-center justify-center space-x-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-10 py-5 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Get Started</span>
                            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center space-x-3 bg-white text-blue-600 px-10 py-5 rounded-2xl hover:bg-gray-50 transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl border-2 border-blue-600 transform hover:scale-105"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign In</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                            <div className="bg-linear-to-br from-blue-100 to-blue-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform hover:rotate-6 transition-transform duration-300">
                                <svg
                                    className="w-10 h-10 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                Easy Search
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Find medicines quickly by name, category, or
                                manufacturer with our smart search
                            </p>
                        </div>

                        <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                            <div className="bg-linear-to-br from-green-100 to-green-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform hover:rotate-6 transition-transform duration-300">
                                <svg
                                    className="w-10 h-10 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                Cash on Delivery
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Pay conveniently when your order arrives at your
                                doorstep - safe and secure
                            </p>
                        </div>

                        <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                            <div className="bg-linear-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform hover:rotate-6 transition-transform duration-300">
                                <svg
                                    className="w-10 h-10 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                Fast Delivery
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Track your order status in real-time until it
                                reaches you safely
                            </p>
                        </div>
                    </div>

                    <div className="mt-20 bg-white rounded-3xl shadow-2xl p-12 max-w-4xl mx-auto border border-gray-100">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">
                            Why Choose MediCare?
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6 text-left">
                            <div className="flex items-start space-x-4">
                                <div className="bg-green-100 p-3 rounded-xl">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Genuine Medicines</h4>
                                    <p className="text-gray-600 text-sm">100% authentic products from verified sources</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-blue-100 p-3 rounded-xl">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">24/7 Service</h4>
                                    <p className="text-gray-600 text-sm">Order anytime, anywhere with ease</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-purple-100 p-3 rounded-xl">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Secure Orders</h4>
                                    <p className="text-gray-600 text-sm">Your data and orders are completely safe</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="bg-red-100 p-3 rounded-xl">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Customer Care</h4>
                                    <p className="text-gray-600 text-sm">Dedicated support for all your needs</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (adminOnly && user.role !== "admin") {
        return <Navigate to="/medicines" />;
    }

    return children;
};

// Main App Component
function App() {
    return (
        <Router>
            <AuthProvider>
                <FavoritesProvider>
                    <CartProvider>
                        <div className="min-h-screen bg-gray-50">
                            <Navbar />
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route
                                    path="/register"
                                    element={<RegisterPage />}
                                />

                                <Route
                                    path="/medicines"
                                    element={
                                        <ProtectedRoute>
                                            <MedicinesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/favorites"
                                    element={
                                        <ProtectedRoute>
                                            <FavoritesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/cart"
                                    element={
                                        <ProtectedRoute>
                                            <CartPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/orders"
                                    element={
                                        <ProtectedRoute>
                                            <OrdersPage />
                                        </ProtectedRoute>
                                    }
                                />

                                <Route
                                    path="/admin/dashboard"
                                    element={
                                        <ProtectedRoute adminOnly>
                                            <AdminDashboard />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/medicines"
                                    element={
                                        <ProtectedRoute adminOnly>
                                            <AdminMedicines />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/orders"
                                    element={
                                        <ProtectedRoute adminOnly>
                                            <AdminOrders />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </div>
                    </CartProvider>
                </FavoritesProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;

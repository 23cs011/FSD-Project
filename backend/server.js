const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URL, {
    dbName: "online_medicine_db"
})
    .then(() => console.log("Database connected"));

// Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    createdAt: { type: Date, default: Date.now },
});

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    manufacturer: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    imageUrl: { type: String },
    requiresPrescription: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    totalAmount: { type: Number, required: true },
    deliveryAddress: { type: String, required: true },
    phone: { type: String, required: true },
    status: {
        type: String,
        enum: [
            "PLACED",
            "ACCEPTED",
            "REJECTED",
            "OUT FOR DELIVERY",
            "DELIVERED",
            "CANCELLED",
        ],
        default: "PLACED",
    },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Medicine = mongoose.model("Medicine", medicineSchema);
const Order = mongoose.model("Order", orderSchema);

// Middleware for authentication
const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) throw new Error();

        const decoded = jwt.verify(token, "your-secret-key");
        const user = await User.findById(decoded.userId);

        if (!user) throw new Error();

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate" });
    }
};

const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {});
        if (req.user.role !== "admin") {
            return res.status(403).send({ error: "Admin access required" });
        }
        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate as admin" });
    }
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, "your-secret-key");
        res.status(201).send({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, "your-secret-key");
        res.send({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
            },
            token,
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Medicine Routes
app.get("/api/medicines", async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { manufacturer: { $regex: search, $options: "i" } },
            ];
        }

        if (category && category !== "all") {
            query.category = category;
        }

        const medicines = await Medicine.find(query);
        res.send(medicines);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get("/api/medicines/:id", async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).send({ error: "Medicine not found" });
        }
        res.send(medicine);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post("/api/medicines", adminAuth, async (req, res) => {
    try {
        const medicine = new Medicine(req.body);
        await medicine.save();
        res.status(201).send(medicine);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.put("/api/medicines/:id", adminAuth, async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!medicine) {
            return res.status(404).send({ error: "Medicine not found" });
        }
        res.send(medicine);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.delete("/api/medicines/:id", adminAuth, async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndDelete(req.params.id);
        if (!medicine) {
            return res.status(404).send({ error: "Medicine not found" });
        }
        res.send({ message: "Medicine deleted successfully" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Order Routes
app.post("/api/orders", auth, async (req, res) => {
    try {
        const { items, totalAmount, deliveryAddress, phone } = req.body;

        // Check stock availability and update
        for (let item of items) {
            const medicine = await Medicine.findById(item.medicine);
            if (!medicine || medicine.stock < item.quantity) {
                return res.status(400).send({
                    error: `Insufficient stock for ${
                        medicine?.name || "medicine"
                    }`,
                });
            }

            // Reduce stock
            medicine.stock -= item.quantity;
            await medicine.save();
        }

        const order = new Order({
            user: req.user._id,
            items,
            totalAmount,
            deliveryAddress,
            phone,
            status: "PLACED",
        });

        await order.save();
        await order.populate("items.medicine");

        res.status(201).send(order);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.get("/api/orders", auth, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== "admin") {
            query.user = req.user._id;
        }

        const orders = await Order.find(query)
            .populate("items.medicine")
            .populate("user", "name email phone")
            .sort({ createdAt: -1 });

        res.send(orders);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get("/api/orders/:id", auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("items.medicine")
            .populate("user", "name email phone address");

        if (!order) {
            return res.status(404).send({ error: "Order not found" });
        }

        if (
            req.user.role !== "admin" &&
            order.user._id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).send({ error: "Access denied" });
        }

        res.send(order);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.put("/api/orders/:id/status", auth, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const order = await Order.findById(req.params.id).populate(
            "items.medicine"
        );

        if (!order) {
            return res.status(404).send({ error: "Order not found" });
        }

        // User can only cancel their own orders
        if (status === "CANCELLED" && req.user.role !== "admin") {
            if (order.user.toString() !== req.user._id.toString()) {
                return res.status(403).send({ error: "Access denied" });
            }
            if (order.status !== "PLACED") {
                return res
                    .status(400)
                    .send({ error: "Cannot cancel order at this stage" });
            }
        }

        // Admin actions
        if (
            req.user.role === "admin" &&
            ["ACCEPTED", "REJECTED", "OUT FOR DELIVERY", "DELIVERED"].includes(
                status
            )
        ) {
            // Admin can update
        } else if (status !== "CANCELLED") {
            return res.status(403).send({ error: "Access denied" });
        }

        const oldStatus = order.status;
        order.status = status;
        order.updatedAt = new Date();

        if (status === "REJECTED" && rejectionReason) {
            order.rejectionReason = rejectionReason;
        }

        // Restore stock if order is rejected or cancelled
        if (
            (status === "REJECTED" || status === "CANCELLED") &&
            oldStatus === "PLACED"
        ) {
            for (let item of order.items) {
                const medicine = await Medicine.findById(item.medicine._id);
                if (medicine) {
                    medicine.stock += item.quantity;
                    await medicine.save();
                }
            }
        }

        await order.save();
        await order.populate("items.medicine");

        res.send(order);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Dashboard stats for admin
app.get("/api/admin/stats", adminAuth, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalMedicines = await Medicine.countDocuments();
        const totalUsers = await User.countDocuments({ role: "user" });
        const pendingOrders = await Order.countDocuments({ status: "PLACED" });

        res.send({
            totalOrders,
            totalMedicines,
            totalUsers,
            pendingOrders,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Categories endpoint
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await Medicine.distinct("category");
        res.send(categories);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

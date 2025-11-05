const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/online_medicine_db");

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
    requiresPrescription: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Medicine = mongoose.model("Medicine", medicineSchema);

const seedDatabase = async () => {
    try {
        console.log("🌱 Starting database seeding...");

        // Clear existing data
        await User.deleteMany({});
        await Medicine.deleteMany({});
        console.log("✅ Cleared existing data");

        // Create admin user
        const adminPassword = await bcrypt.hash("admin123", 10);
        const admin = await User.create({
            name: "Admin User",
            email: "admin@demo.com",
            password: adminPassword,
            phone: "9876543210",
            address: "Admin Office, Medical District, City",
            role: "admin",
        });
        console.log("✅ Created admin user");

        // Create demo user
        const userPassword = await bcrypt.hash("user123", 10);
        const user = await User.create({
            name: "Demo User",
            email: "user@demo.com",
            password: userPassword,
            phone: "9123456780",
            address: "123 Main Street, Apartment 4B, City, State - 12345",
            role: "user",
        });
        console.log("✅ Created demo user");

        // Create medicines
        const medicines = [
            {
                name: "Paracetamol 500mg",
                description:
                    "Effective pain relief and fever reducer. Suitable for headaches, muscle aches, arthritis, backache, toothaches, colds, and fevers.",
                category: "Pain Relief",
                price: 50,
                stock: 100,
                manufacturer: "PharmaCorp Ltd.",
                expiryDate: new Date("2025-12-31"),
                requiresPrescription: false,
            },
            {
                name: "Amoxicillin 250mg",
                description:
                    "Broad-spectrum antibiotic used to treat various bacterial infections including respiratory tract infections, ear infections, and skin infections.",
                category: "Antibiotics",
                price: 120,
                stock: 75,
                manufacturer: "HealthMed Pharma",
                expiryDate: new Date("2025-10-31"),
                requiresPrescription: true,
            },
            {
                name: "Cetirizine 10mg",
                description:
                    "Antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, itching eyes/nose, and sneezing.",
                category: "Allergy",
                price: 80,
                stock: 150,
                manufacturer: "AllerCare Inc.",
                expiryDate: new Date("2026-03-31"),
                requiresPrescription: false,
            },
            {
                name: "Vitamin D3 1000 IU",
                description:
                    "Essential vitamin supplement for maintaining healthy bones, teeth, and immune system. Helps in calcium absorption.",
                category: "Vitamins",
                price: 200,
                stock: 200,
                manufacturer: "VitaLife Nutrition",
                expiryDate: new Date("2026-06-30"),
                requiresPrescription: false,
            },
            {
                name: "Ibuprofen 400mg",
                description:
                    "Non-steroidal anti-inflammatory drug (NSAID) used to reduce fever and treat pain or inflammation caused by many conditions.",
                category: "Pain Relief",
                price: 75,
                stock: 120,
                manufacturer: "PharmaCorp Ltd.",
                expiryDate: new Date("2025-11-30"),
                requiresPrescription: false,
            },
            {
                name: "Omeprazole 20mg",
                description:
                    "Proton pump inhibitor that decreases the amount of acid produced in the stomach. Used to treat heartburn, acid reflux, and ulcers.",
                category: "Digestive Health",
                price: 95,
                stock: 90,
                manufacturer: "GastroMed Labs",
                expiryDate: new Date("2025-09-30"),
                requiresPrescription: false,
            },
            {
                name: "Metformin 500mg",
                description:
                    "Oral diabetes medicine that helps control blood sugar levels. Used to treat type 2 diabetes.",
                category: "Diabetes",
                price: 85,
                stock: 110,
                manufacturer: "DiaCare Pharmaceuticals",
                expiryDate: new Date("2025-12-31"),
                requiresPrescription: true,
            },
            {
                name: "Lisinopril 10mg",
                description:
                    "ACE inhibitor used to treat high blood pressure (hypertension) and heart failure.",
                category: "Cardiovascular",
                price: 140,
                stock: 80,
                manufacturer: "CardioHealth Pharma",
                expiryDate: new Date("2026-01-31"),
                requiresPrescription: true,
            },
            {
                name: "Azithromycin 500mg",
                description:
                    "Macrolide antibiotic used to treat many different types of infections caused by bacteria.",
                category: "Antibiotics",
                price: 180,
                stock: 60,
                manufacturer: "HealthMed Pharma",
                expiryDate: new Date("2025-08-31"),
                requiresPrescription: true,
            },
            {
                name: "Loratadine 10mg",
                description:
                    "Long-acting antihistamine for relief of allergy symptoms. Non-drowsy formula.",
                category: "Allergy",
                price: 65,
                stock: 140,
                manufacturer: "AllerCare Inc.",
                expiryDate: new Date("2026-04-30"),
                requiresPrescription: false,
            },
            {
                name: "Calcium + Vitamin D",
                description:
                    "Combination supplement for bone health. Contains calcium carbonate and vitamin D3.",
                category: "Vitamins",
                price: 250,
                stock: 180,
                manufacturer: "VitaLife Nutrition",
                expiryDate: new Date("2026-07-31"),
                requiresPrescription: false,
            },
            {
                name: "Aspirin 75mg",
                description:
                    "Low-dose aspirin used to reduce the risk of heart attack and stroke in people at high risk.",
                category: "Cardiovascular",
                price: 40,
                stock: 200,
                manufacturer: "CardioHealth Pharma",
                expiryDate: new Date("2026-02-28"),
                requiresPrescription: false,
            },
            {
                name: "Ranitidine 150mg",
                description:
                    "H2 blocker that reduces stomach acid production. Used for heartburn and acid indigestion.",
                category: "Digestive Health",
                price: 70,
                stock: 95,
                manufacturer: "GastroMed Labs",
                expiryDate: new Date("2025-10-31"),
                requiresPrescription: false,
            },
            {
                name: "Multivitamin Complex",
                description:
                    "Complete daily multivitamin with essential vitamins and minerals for overall health and wellness.",
                category: "Vitamins",
                price: 300,
                stock: 160,
                manufacturer: "VitaLife Nutrition",
                expiryDate: new Date("2026-08-31"),
                requiresPrescription: false,
            },
            {
                name: "Ciprofloxacin 500mg",
                description:
                    "Fluoroquinolone antibiotic used to treat various bacterial infections.",
                category: "Antibiotics",
                price: 150,
                stock: 70,
                manufacturer: "HealthMed Pharma",
                expiryDate: new Date("2025-11-30"),
                requiresPrescription: true,
            },
        ];

        await Medicine.insertMany(medicines);
        console.log("✅ Created 15 medicines");

        console.log("\n🎉 Database seeding completed successfully!\n");
        console.log("📝 Demo Accounts:");
        console.log("   Admin: admin@demo.com / admin123");
        console.log("   User:  user@demo.com / user123\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();

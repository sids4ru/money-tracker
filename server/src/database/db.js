"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_PATH = exports.closeDatabase = exports.run = exports.get = exports.query = exports.initializeDatabase = exports.db = void 0;
var sqlite3_1 = __importDefault(require("sqlite3"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
// Ensure the data directory exists
var DATA_DIR = path_1.default.resolve(__dirname, '../../data');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
// Define the database file path
var DB_PATH = path_1.default.join(DATA_DIR, 'finance_tracker.db');
exports.DB_PATH = DB_PATH;
// Create a new database connection
var db = new sqlite3_1.default.Database(DB_PATH, function (err) {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log("Connected to SQLite database at ".concat(DB_PATH));
});
exports.db = db;
// Enable foreign keys support
db.exec('PRAGMA foreign_keys = ON;');
// Initialize the database schema
var initializeDatabase = function () {
    return new Promise(function (resolve, reject) {
        console.log('Initializing database schema...');
        db.serialize(function () {
            // Create transactions table if it doesn't exist
            db.run("\n        CREATE TABLE IF NOT EXISTS transactions (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          account_number TEXT NOT NULL,\n          transaction_date TEXT NOT NULL,\n          description1 TEXT,\n          description2 TEXT,\n          description3 TEXT,\n          debit_amount TEXT,\n          credit_amount TEXT,\n          balance TEXT NOT NULL,\n          currency TEXT NOT NULL,\n          transaction_type TEXT NOT NULL,\n          local_currency_amount TEXT,\n          local_currency TEXT,\n          grouping_status TEXT CHECK(grouping_status IN ('manual', 'auto', 'none') OR grouping_status IS NULL),\n          category_id INTEGER,\n          created_at TEXT NOT NULL DEFAULT (datetime('now'))\n        )\n      ", function (err) {
                if (err) {
                    console.error('Error creating transactions table:', err.message);
                    reject(err);
                    return;
                }
                // Create index for faster lookups and duplicate detection
                db.run("\n          CREATE INDEX IF NOT EXISTS idx_transaction_lookup \n          ON transactions(account_number, transaction_date, description1, debit_amount, credit_amount)\n        ", function (err) {
                    if (err) {
                        console.error('Error creating index:', err.message);
                        reject(err);
                        return;
                    }
                    // Create categories table
                    db.run("\n            CREATE TABLE IF NOT EXISTS categories (\n              id INTEGER PRIMARY KEY AUTOINCREMENT,\n              name TEXT NOT NULL UNIQUE,\n              parent_id INTEGER,\n              description TEXT,\n              created_at TEXT NOT NULL DEFAULT (datetime('now')),\n              FOREIGN KEY (parent_id) REFERENCES categories (id)\n            )\n          ", function (err) {
                        if (err) {
                            console.error('Error creating categories table:', err.message);
                            reject(err);
                            return;
                        }
                        // Create transaction_categories junction table
                        db.run("\n              CREATE TABLE IF NOT EXISTS transaction_categories (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                transaction_id INTEGER NOT NULL,\n                category_id INTEGER NOT NULL,\n                created_at TEXT NOT NULL DEFAULT (datetime('now')),\n                UNIQUE(transaction_id, category_id),\n                FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,\n                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE\n              )\n            ", function (err) {
                            if (err) {
                                console.error('Error creating transaction_categories table:', err.message);
                                reject(err);
                                return;
                            }
                            // Create indexes for performance
                            db.run("\n                CREATE INDEX IF NOT EXISTS idx_transaction_categories_transaction_id \n                ON transaction_categories(transaction_id)\n              ", function (err) {
                                if (err) {
                                    console.error('Error creating transaction_categories index:', err.message);
                                    reject(err);
                                    return;
                                }
                                db.run("\n                  CREATE INDEX IF NOT EXISTS idx_transaction_categories_category_id \n                  ON transaction_categories(category_id)\n                ", function (err) {
                                    if (err) {
                                        console.error('Error creating transaction_categories index:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    // Seed initial categories if needed
                                    seedInitialCategories().then(function () {
                                        console.log('Database schema initialized successfully');
                                        resolve();
                                    }).catch(function (err) {
                                        console.error('Error seeding initial categories:', err.message);
                                        reject(err);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};
exports.initializeDatabase = initializeDatabase;
// Seed initial categories
var seedInitialCategories = function () { return __awaiter(void 0, void 0, void 0, function () {
    var categories, mainCategories, mainCategoryIds, _i, mainCategories_1, category, result, error_1, subCategories, _a, subCategories_1, category, parentId, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, query('SELECT COUNT(*) as count FROM categories')];
            case 1:
                categories = _b.sent();
                if (categories[0].count > 0) {
                    console.log('Categories already seeded, skipping...');
                    return [2 /*return*/];
                }
                console.log('Seeding initial categories...');
                mainCategories = [
                    { name: 'Earnings', description: 'Income and revenue sources' },
                    { name: 'Expenditures', description: 'All expenses and outgoing payments' },
                    { name: 'Savings', description: 'Savings and investments' }
                ];
                mainCategoryIds = {};
                _i = 0, mainCategories_1 = mainCategories;
                _b.label = 2;
            case 2:
                if (!(_i < mainCategories_1.length)) return [3 /*break*/, 7];
                category = mainCategories_1[_i];
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, run('INSERT INTO categories (name, description) VALUES (?, ?)', [category.name, category.description])];
            case 4:
                result = _b.sent();
                mainCategoryIds[category.name] = result.lastID;
                console.log("Added category: ".concat(category.name, " with ID ").concat(result.lastID));
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                console.error("Error adding category ".concat(category.name, ":"), error_1);
                throw error_1;
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7:
                subCategories = [
                    // Earnings subcategories
                    // { name: 'Salary', parentName: 'Earnings', description: 'Regular employment income' },
                    // Expenditures subcategories
                    { name: 'Grocery', parentName: 'Expenditures', description: 'Food and household items (Tesco, Aldi, Lidl, etc.)' },
                    { name: 'Entertainment', parentName: 'Expenditures', description: 'Restaurants, cinema, bars, etc.' },
                    { name: 'Travel', parentName: 'Expenditures', description: 'Flights, hotels, train tickets, etc.' },
                    { name: 'Utilities', parentName: 'Expenditures', description: 'Electricity, gas, water, internet, etc.' },
                    // Savings subcategories
                    { name: 'Fixed Deposits', parentName: 'Savings', description: 'FD accounts and term deposits' },
                    { name: 'Recurring Deposits', parentName: 'Savings', description: 'RD accounts' },
                    { name: 'eToro', parentName: 'Savings', description: 'eToro trading platform' },
                    { name: 'Trading 121', parentName: 'Savings', description: 'Trading 121 platform' },
                ];
                _a = 0, subCategories_1 = subCategories;
                _b.label = 8;
            case 8:
                if (!(_a < subCategories_1.length)) return [3 /*break*/, 13];
                category = subCategories_1[_a];
                _b.label = 9;
            case 9:
                _b.trys.push([9, 11, , 12]);
                parentId = mainCategoryIds[category.parentName];
                if (!parentId) {
                    throw new Error("Parent category ".concat(category.parentName, " not found"));
                }
                return [4 /*yield*/, run('INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)', [category.name, parentId, category.description])];
            case 10:
                _b.sent();
                console.log("Added subcategory: ".concat(category.name, " under ").concat(category.parentName));
                return [3 /*break*/, 12];
            case 11:
                error_2 = _b.sent();
                console.error("Error adding subcategory ".concat(category.name, ":"), error_2);
                throw error_2;
            case 12:
                _a++;
                return [3 /*break*/, 8];
            case 13:
                console.log('Initial categories seeded successfully');
                return [2 /*return*/];
        }
    });
}); };
// Execute database queries with promise wrapper
var query = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        db.all(sql, params, function (err, rows) {
            if (err) {
                console.error('Database query error:', err.message);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
};
exports.query = query;
// Execute a single operation and get the first result
var get = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        db.get(sql, params, function (err, row) {
            if (err) {
                console.error('Database get error:', err.message);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
};
exports.get = get;
// Execute a query that doesn't return data
var run = function (sql, params) {
    if (params === void 0) { params = []; }
    return new Promise(function (resolve, reject) {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Database run error:', err.message);
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};
exports.run = run;
// Close the database connection
var closeDatabase = function () {
    return new Promise(function (resolve, reject) {
        db.close(function (err) {
            if (err) {
                console.error('Error closing database:', err.message);
                reject(err);
                return;
            }
            console.log('Database connection closed');
            resolve();
        });
    });
};
exports.closeDatabase = closeDatabase;

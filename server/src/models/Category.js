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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCategoryModel = exports.CategoryModel = void 0;
var db_1 = require("../database/db");
var CategoryModel = /** @class */ (function () {
    function CategoryModel() {
    }
    /**
     * Get all categories from the database
     */
    CategoryModel.getAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, db_1.query)('SELECT * FROM categories ORDER BY name')];
            });
        });
    };
    /**
     * Get a category by its ID
     */
    CategoryModel.getById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, db_1.get)('SELECT * FROM categories WHERE id = ?', [id])];
            });
        });
    };
    /**
     * Create a new category
     */
    CategoryModel.create = function (category) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.run)("INSERT INTO categories (\n        name, parent_id, description\n      ) VALUES (?, ?, ?)", [
                            category.name,
                            category.parent_id || null,
                            category.description || null
                        ])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    };
    /**
     * Update an existing category
     */
    CategoryModel.update = function (id, category) {
        return __awaiter(this, void 0, void 0, function () {
            var fields, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fields = [];
                        values = [];
                        Object.entries(category).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (key !== 'id' && key !== 'created_at') {
                                fields.push("".concat(key, " = ?"));
                                values.push(value);
                            }
                        });
                        if (fields.length === 0) {
                            return [2 /*return*/, false];
                        }
                        values.push(id);
                        return [4 /*yield*/, (0, db_1.run)("UPDATE categories SET ".concat(fields.join(', '), " WHERE id = ?"), values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.changes > 0];
                }
            });
        });
    };
    /**
     * Delete a category by ID
     */
    CategoryModel.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.run)('DELETE FROM categories WHERE id = ?', [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.changes > 0];
                }
            });
        });
    };
    /**
     * Get all sub-categories of a parent category
     */
    CategoryModel.getSubcategories = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, db_1.query)('SELECT * FROM categories WHERE parent_id = ? ORDER BY name', [parentId])];
            });
        });
    };
    /**
     * Find a category by name
     */
    CategoryModel.findByName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, db_1.get)('SELECT * FROM categories WHERE name = ?', [name])];
            });
        });
    };
    return CategoryModel;
}());
exports.CategoryModel = CategoryModel;
var TransactionCategoryModel = /** @class */ (function () {
    function TransactionCategoryModel() {
    }
    /**
     * Assign a category to a transaction
     */
    TransactionCategoryModel.assignCategory = function (transactionId, categoryId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.get)('SELECT * FROM transaction_categories WHERE transaction_id = ? AND category_id = ?', [transactionId, categoryId])];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            return [2 /*return*/, existing.id];
                        }
                        return [4 /*yield*/, (0, db_1.run)('INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)', [transactionId, categoryId])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    };
    /**
     * Get categories for a transaction
     */
    TransactionCategoryModel.getCategoriesForTransaction = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, db_1.query)("SELECT c.* \n       FROM categories c\n       JOIN transaction_categories tc ON c.id = tc.category_id\n       WHERE tc.transaction_id = ?\n       ORDER BY c.name", [transactionId])];
            });
        });
    };
    /**
     * Get all transactions for a category
     */
    TransactionCategoryModel.getTransactionsForCategory = function (categoryId) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.query)('SELECT transaction_id FROM transaction_categories WHERE category_id = ?', [categoryId])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.map(function (row) { return row.transaction_id; })];
                }
            });
        });
    };
    /**
     * Remove a category assignment from a transaction
     */
    TransactionCategoryModel.removeCategory = function (transactionId, categoryId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.run)('DELETE FROM transaction_categories WHERE transaction_id = ? AND category_id = ?', [transactionId, categoryId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.changes > 0];
                }
            });
        });
    };
    /**
     * Remove all category assignments for a transaction
     */
    TransactionCategoryModel.removeAllCategories = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.run)('DELETE FROM transaction_categories WHERE transaction_id = ?', [transactionId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.changes > 0];
                }
            });
        });
    };
    return TransactionCategoryModel;
}());
exports.TransactionCategoryModel = TransactionCategoryModel;

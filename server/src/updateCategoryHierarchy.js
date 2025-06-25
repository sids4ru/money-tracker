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
var Category_1 = require("./models/Category");
var db_1 = require("./database/db");
// Define parent-child relationships for categories
var categoryRelationships = [
    { name: 'Grocery', parentName: 'Expenditures' },
    { name: 'Entertainment', parentName: 'Expenditures' },
    { name: 'Utilities', parentName: 'Expenditures' },
    { name: 'Travel', parentName: 'Expenditures' },
    { name: 'Rent', parentName: 'Expenditures' },
    { name: 'School', parentName: 'Expenditures' },
    { name: 'Holiday', parentName: 'Expenditures' },
    { name: 'Revolute', parentName: 'Savings' },
    { name: 'Recurring Deposits', parentName: 'Savings' },
    { name: 'Fixed Deposits', parentName: 'Savings' },
    { name: 'eToro', parentName: 'Savings' },
    { name: 'Trading 121', parentName: 'Savings' },
    { name: 'Salary', parentName: 'Earnings' },
    { name: 'Others', parentName: 'Earnings' },
    { name: 'Dividents', parentName: 'Earnings' }
];
function updateCategoryHierarchy() {
    return __awaiter(this, void 0, void 0, function () {
        var allCategories, categoryMap_1, updateCount, _i, categoryRelationships_1, relationship, childId, parentId, success, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    // Initialize database connection
                    return [4 /*yield*/, (0, db_1.initializeDatabase)()];
                case 1:
                    // Initialize database connection
                    _a.sent();
                    console.log('Database connection established');
                    return [4 /*yield*/, Category_1.CategoryModel.getAll()];
                case 2:
                    allCategories = _a.sent();
                    categoryMap_1 = new Map();
                    allCategories.forEach(function (category) {
                        if (category.name && category.id) {
                            categoryMap_1.set(category.name, category.id);
                        }
                    });
                    console.log('Found categories:', categoryMap_1.size);
                    updateCount = 0;
                    _i = 0, categoryRelationships_1 = categoryRelationships;
                    _a.label = 3;
                case 3:
                    if (!(_i < categoryRelationships_1.length)) return [3 /*break*/, 7];
                    relationship = categoryRelationships_1[_i];
                    childId = categoryMap_1.get(relationship.name);
                    parentId = categoryMap_1.get(relationship.parentName);
                    if (!(childId && parentId)) return [3 /*break*/, 5];
                    console.log("Setting ".concat(relationship.name, " (ID: ").concat(childId, ") as child of ").concat(relationship.parentName, " (ID: ").concat(parentId, ")"));
                    return [4 /*yield*/, Category_1.CategoryModel.update(childId, { parent_id: parentId })];
                case 4:
                    success = _a.sent();
                    if (success) {
                        updateCount++;
                        console.log("Successfully updated ".concat(relationship.name));
                    }
                    else {
                        console.error("Failed to update ".concat(relationship.name));
                    }
                    return [3 /*break*/, 6];
                case 5:
                    console.warn("Couldn't find IDs for ".concat(relationship.name, " (").concat(childId, ") or ").concat(relationship.parentName, " (").concat(parentId, ")"));
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 3];
                case 7:
                    console.log("Updated ".concat(updateCount, " categories successfully"));
                    console.log('Category hierarchy update complete');
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('Error updating category hierarchy:', error_1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Execute the update
updateCategoryHierarchy().then(function () {
    console.log('Category update script completed');
    process.exit(0);
}).catch(function (err) {
    console.error('Error running update script:', err);
    process.exit(1);
});

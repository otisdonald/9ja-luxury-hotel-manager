const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    description: String,
    budget: {
        monthly: {
            type: Number,
            default: 0
        },
        remaining: {
            type: Number,
            default: 0
        },
        spent: {
            type: Number,
            default: 0
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    manager: {
        staffId: String,
        name: String,
        contact: String
    },
    category: {
        type: String,
        enum: ['Operations', 'Food & Beverage', 'Housekeeping', 'Maintenance', 'Administration', 'Marketing', 'Security', 'IT'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    creditLimit: {
        type: Number,
        default: 0
    },
    currentDebt: {
        type: Number,
        default: 0
    },
    creditRating: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F'],
        default: 'B'
    }
}, {
    timestamps: true
});

// Calculate financial health score
departmentSchema.virtual('financialHealth').get(function() {
    const budgetUtilization = this.budget.spent / this.budget.monthly;
    const debtRatio = this.currentDebt / this.budget.monthly;
    
    let score = 100;
    if (budgetUtilization > 0.9) score -= 20;
    if (budgetUtilization > 1.0) score -= 30;
    if (debtRatio > 0.5) score -= 25;
    if (debtRatio > 1.0) score -= 35;
    
    return Math.max(score, 0);
});

module.exports = mongoose.model('Department', departmentSchema);
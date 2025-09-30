const mongoose = require('mongoose');

const departmentLoanSchema = new mongoose.Schema({
    loanId: {
        type: String,
        required: true,
        unique: true
    },
    borrowerDepartment: {
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    lenderDepartment: {
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    principalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    interestRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100 // Percentage
    },
    interestType: {
        type: String,
        enum: ['simple', 'compound'],
        default: 'simple'
    },
    termDays: {
        type: Number,
        required: true,
        min: 1
    },
    purpose: {
        type: String,
        required: true,
        enum: ['Equipment Purchase', 'Maintenance', 'Salary Payment', 'Utility Bills', 'Emergency Expense', 'Inventory Purchase', 'Other']
    },
    purposeDescription: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'active', 'completed', 'defaulted', 'cancelled'],
        default: 'pending'
    },
    approvedBy: {
        staffId: String,
        name: String,
        position: String,
        approvalDate: Date
    },
    startDate: Date,
    dueDate: Date,
    repayments: [{
        amount: {
            type: Number,
            required: true
        },
        principal: Number,
        interest: Number,
        date: {
            type: Date,
            default: Date.now
        },
        method: {
            type: String,
            enum: ['budget_allocation', 'cash', 'transfer', 'offset'],
            default: 'budget_allocation'
        },
        processedBy: {
            staffId: String,
            name: String
        },
        notes: String
    }],
    collateral: {
        description: String,
        value: Number,
        type: String
    },
    penalties: [{
        type: {
            type: String,
            enum: ['late_payment', 'default', 'early_termination']
        },
        amount: Number,
        date: Date,
        reason: String
    }],
    notes: String,
    attachments: [String]
}, {
    timestamps: true
});

// Generate unique loan ID
departmentLoanSchema.pre('save', function(next) {
    if (!this.loanId) {
        const timestamp = Date.now().toString().slice(-6);
        this.loanId = `LOAN-${this.borrowerDepartment.code}-${timestamp}`;
    }
    next();
});

// Calculate total amount due (principal + interest)
departmentLoanSchema.virtual('totalAmountDue').get(function() {
    let totalInterest = 0;
    
    if (this.interestType === 'simple') {
        totalInterest = (this.principalAmount * this.interestRate * this.termDays) / (365 * 100);
    } else {
        const periods = this.termDays / 365;
        totalInterest = this.principalAmount * (Math.pow(1 + (this.interestRate / 100), periods) - 1);
    }
    
    return this.principalAmount + totalInterest;
});

// Calculate remaining balance
departmentLoanSchema.virtual('remainingBalance').get(function() {
    const totalPaid = this.repayments.reduce((sum, payment) => sum + payment.amount, 0);
    return this.totalAmountDue - totalPaid;
});

// Calculate days overdue
departmentLoanSchema.virtual('daysOverdue').get(function() {
    if (this.status !== 'active' || !this.dueDate) return 0;
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    if (today <= dueDate) return 0;
    return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('DepartmentLoan', departmentLoanSchema);
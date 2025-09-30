const mongoose = require('mongoose');

const departmentTransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['payment', 'loan_disbursement', 'loan_repayment', 'budget_allocation', 'transfer', 'penalty', 'refund']
    },
    fromDepartment: {
        code: String,
        name: String
    },
    toDepartment: {
        code: String,
        name: String
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Utilities', 'Maintenance', 'Salaries', 'Equipment', 'Supplies', 'Services', 'Emergency', 'Other'],
        required: true
    },
    subcategory: String,
    relatedOrderId: String, // For order payments
    relatedLoanId: String,  // For loan transactions
    status: {
        type: String,
        enum: ['pending', 'approved', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    approvalRequired: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        staffId: String,
        name: String,
        position: String,
        approvalDate: Date
    },
    processedBy: {
        staffId: String,
        name: String,
        position: String
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'budget_allocation', 'loan', 'credit'],
        default: 'budget_allocation'
    },
    dueDate: Date,
    completedDate: Date,
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    recurring: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
        },
        nextDueDate: Date,
        endDate: Date
    },
    attachments: [{
        filename: String,
        path: String,
        uploadedBy: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    notes: String,
    tags: [String]
}, {
    timestamps: true
});

// Generate unique transaction ID
departmentTransactionSchema.pre('save', function(next) {
    if (!this.transactionId) {
        const timestamp = Date.now().toString().slice(-6);
        const typeCode = this.type.toUpperCase().slice(0, 3);
        this.transactionId = `TXN-${typeCode}-${timestamp}`;
    }
    next();
});

// Check if transaction requires approval
departmentTransactionSchema.pre('save', function(next) {
    // Auto-approve small amounts or certain types
    if (this.amount <= 10000 || ['budget_allocation', 'loan_repayment'].includes(this.type)) {
        this.approvalRequired = false;
        this.status = 'approved';
    } else if (this.amount > 100000) {
        this.approvalRequired = true;
    }
    next();
});

module.exports = mongoose.model('DepartmentTransaction', departmentTransactionSchema);
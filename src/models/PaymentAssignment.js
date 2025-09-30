const mongoose = require('mongoose');

const paymentAssignmentSchema = new mongoose.Schema({
    assignmentId: {
        type: String,
        required: true,
        unique: true
    },
    orderType: {
        type: String,
        required: true,
        enum: ['kitchen_order', 'bar_order', 'guest_order', 'maintenance_request', 'supply_order', 'service_request']
    },
    orderId: {
        type: String,
        required: true
    },
    originalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    assignedDepartments: [{
        departmentCode: {
            type: String,
            required: true
        },
        departmentName: {
            type: String,
            required: true
        },
        assignedAmount: {
            type: Number,
            required: true,
            min: 0
        },
        percentage: {
            type: Number,
            min: 0,
            max: 100
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'paid', 'overdue', 'disputed'],
            default: 'pending'
        },
        dueDate: Date,
        paidDate: Date,
        paymentMethod: String,
        notes: String
    }],
    totalAssigned: {
        type: Number,
        default: 0
    },
    assignmentReason: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'partially_paid', 'fully_paid', 'overdue', 'cancelled'],
        default: 'draft'
    },
    assignedBy: {
        staffId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        position: String
    },
    approvedBy: {
        staffId: String,
        name: String,
        position: String,
        approvalDate: Date
    },
    dueDate: Date,
    vendor: {
        name: String,
        contact: String,
        paymentTerms: String
    },
    splitCriteria: {
        type: String,
        enum: ['equal', 'percentage', 'usage_based', 'benefit_based', 'custom'],
        default: 'custom'
    },
    recurringInfo: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        frequency: String,
        nextAssignmentDate: Date
    },
    attachments: [String],
    comments: [{
        author: {
            staffId: String,
            name: String
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    auditLog: [{
        action: String,
        performedBy: {
            staffId: String,
            name: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: String
    }]
}, {
    timestamps: true
});

// Generate unique assignment ID
paymentAssignmentSchema.pre('save', function(next) {
    if (!this.assignmentId) {
        const timestamp = Date.now().toString().slice(-6);
        this.assignmentId = `PA-${timestamp}`;
    }
    
    // Calculate total assigned
    this.totalAssigned = this.assignedDepartments.reduce((sum, dept) => sum + dept.assignedAmount, 0);
    
    next();
});

// Calculate completion percentage
paymentAssignmentSchema.virtual('completionPercentage').get(function() {
    const paidAmount = this.assignedDepartments
        .filter(dept => dept.status === 'paid')
        .reduce((sum, dept) => sum + dept.assignedAmount, 0);
    
    return this.totalAssigned > 0 ? (paidAmount / this.totalAssigned) * 100 : 0;
});

// Check if overdue
paymentAssignmentSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== 'fully_paid';
});

module.exports = mongoose.model('PaymentAssignment', paymentAssignmentSchema);
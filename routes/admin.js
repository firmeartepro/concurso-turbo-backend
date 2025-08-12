const express = require('express');
const { getAllPayments, getDashboardStats } = require('../models/database');
const { sendTestEmail, verifyEmailConfig } = require('../services/email');
const router = express.Router();

// Simple authentication middleware
const adminAuth = (req, res, next) => {
    const { authorization } = req.headers;
    const adminToken = process.env.ADMIN_TOKEN || 'admin123';
    
    if (!authorization || authorization !== `Bearer ${adminToken}`) {
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Valid admin token required'
        });
    }
    
    next();
};

// Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
    try {
        console.log('📊 Getting dashboard stats...');
        
        const stats = await getDashboardStats();
        
        // Add additional calculated stats
        const enhancedStats = {
            ...stats,
            conversion_rate: stats.total_payments > 0 ? 
                ((stats.approved_payments / stats.total_payments) * 100).toFixed(2) : 0,
            average_order_value: stats.approved_payments > 0 ? 
                (stats.total_revenue / stats.approved_payments).toFixed(2) : 0,
            rejection_rate: stats.total_payments > 0 ? 
                ((stats.rejected_payments / stats.total_payments) * 100).toFixed(2) : 0,
            last_updated: new Date().toISOString()
        };
        
        console.log('✅ Stats retrieved successfully');
        res.json(enhancedStats);
        
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get stats',
            message: error.message 
        });
    }
});

// Get all payments with pagination
router.get('/payments', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, plan } = req.query;
        
        console.log('💳 Getting payments list...');
        
        let payments = await getAllPayments();
        
        // Filter by status if provided
        if (status) {
            payments = payments.filter(p => p.status === status);
        }
        
        // Filter by plan if provided
        if (plan) {
            payments = payments.filter(p => p.plan === plan);
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedPayments = payments.slice(startIndex, endIndex);
        
        res.json({
            payments: paginatedPayments,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total_items: payments.length,
                total_pages: Math.ceil(payments.length / limit)
            },
            filters: { status, plan }
        });
        
    } catch (error) {
        console.error('❌ Payments error:', error);
        res.status(500).json({ 
            error: 'Failed to get payments',
            message: error.message 
        });
    }
});

// Get recent payments (last 24 hours)
router.get('/payments/recent', adminAuth, async (req, res) => {
    try {
        const payments = await getAllPayments();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentPayments = payments.filter(payment => {
            const paymentDate = new Date(payment.created_at);
            return paymentDate >= yesterday;
        });
        
        res.json({
            recent_payments: recentPayments,
            count: recentPayments.length,
            period: '24 hours'
        });
        
    } catch (error) {
        console.error('❌ Recent payments error:', error);
        res.status(500).json({ 
            error: 'Failed to get recent payments',
            message: error.message 
        });
    }
});

// Test email functionality
router.post('/test-email', adminAuth, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email address required' 
            });
        }
        
        console.log('📧 Testing email to:', email);
        
        // Verify email configuration first
        const isConfigured = await verifyEmailConfig();
        if (!isConfigured) {
            return res.status(500).json({
                error: 'Email service not properly configured'
            });
        }
        
        // Send test email
        const result = await sendTestEmail(email);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            messageId: result.messageId,
            to: email
        });
        
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({ 
            error: 'Failed to send test email',
            message: error.message 
        });
    }
});

// System health check
router.get('/health', adminAuth, (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'connected',
            email: process.env.SMTP_USER ? 'configured' : 'not configured',
            mercadopago: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'not configured'
        }
    };
    
    res.json(health);
});

// Configuration status
router.get('/config', adminAuth, (req, res) => {
    const config = {
        environment: process.env.NODE_ENV || 'development',
        services: {
            mercadopago: {
                configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
                public_key: process.env.MERCADOPAGO_PUBLIC_KEY ? 'present' : 'missing'
            },
            email: {
                configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
                host: process.env.SMTP_HOST || 'not set',
                user: process.env.SMTP_USER || 'not set'
            },
            urls: {
                frontend: process.env.FRONTEND_URL || 'not set',
                backend: process.env.BACKEND_URL || 'not set',
                system: process.env.SYSTEM_URL || 'not set'
            }
        },
        timestamp: new Date().toISOString()
    };
    
    res.json(config);
});

module.exports = router;

const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { updatePayment, getPaymentById, saveCustomer } = require('../models/database');
const { sendConfirmationEmail, sendAccessCredentials } = require('../services/email');
const router = express.Router();

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});
const payment = new Payment(client);

// Mercado Pago webhook endpoint
router.post('/mercadopago', async (req, res) => {
    console.log('🔔 Webhook received:', {
        headers: req.headers,
        body: req.body,
        timestamp: new Date().toISOString()
    });
    
    try {
        const { type, data, action } = req.body;
        
        // Validate webhook data
        if (!type || !data) {
            console.log('❌ Invalid webhook data');
            return res.status(400).json({ error: 'Invalid webhook data' });
        }
        
        console.log('📋 Webhook details:', { type, action, id: data.id });
        
        // Handle payment notifications
        if (type === 'payment') {
            const paymentId = data.id;
            
            if (!paymentId) {
                console.log('❌ Missing payment ID');
                return res.status(400).json({ error: 'Missing payment ID' });
            }
            
            console.log('💳 Processing payment webhook for ID:', paymentId);
            
            // Get payment details from Mercado Pago
            const paymentDetails = await payment.get({ id: paymentId });
            
            console.log('📊 Payment details from MP:', {
                id: paymentDetails.id,
                status: paymentDetails.status,
                status_detail: paymentDetails.status_detail,
                external_reference: paymentDetails.external_reference,
                transaction_amount: paymentDetails.transaction_amount
            });
            
            // Update payment in database
            await updatePayment(paymentId, {
                status: paymentDetails.status,
                status_detail: paymentDetails.status_detail
            });
            
            console.log('✅ Payment updated in database');
            
            // If payment was approved, grant access and send credentials
            if (paymentDetails.status === 'approved') {
                console.log('🎉 Payment approved, granting access...');
                
                const dbPayment = await getPaymentById(paymentId);
                
                if (dbPayment) {
                    console.log('👤 Customer data:', {
                        email: dbPayment.customer_email,
                        name: dbPayment.customer_name,
                        plan: dbPayment.plan
                    });
                    
                    // Generate temporary password
                    const tempPassword = generateTempPassword();
                    
                    // Save customer with access granted
                    await saveCustomer({
                        email: dbPayment.customer_email,
                        name: dbPayment.customer_name,
                        document: dbPayment.customer_document,
                        plan: dbPayment.plan,
                        status: 'active',
                        access_granted: 1,
                        temp_password: tempPassword
                    });
                    
                    console.log('✅ Customer saved with access granted');
                    
                    // Send access credentials email
                    try {
                        await sendAccessCredentials({
                            email: dbPayment.customer_email,
                            name: dbPayment.customer_name,
                            password: tempPassword,
                            login_url: process.env.SYSTEM_URL || 'https://sistema.concursoturbo.com'
                        });
                        
                        console.log('📧 Access credentials email sent successfully');
                    } catch (emailError) {
                        console.error('❌ Failed to send access credentials email:', emailError);
                        // Don't fail the webhook if email fails
                    }
                    
                    console.log('🎯 Access granted successfully to:', dbPayment.customer_email);
                } else {
                    console.log('❌ Payment not found in database:', paymentId);
                }
            } else if (paymentDetails.status === 'rejected') {
                console.log('❌ Payment rejected:', paymentDetails.status_detail);
            } else if (paymentDetails.status === 'pending') {
                console.log('⏳ Payment still pending:', paymentDetails.status_detail);
            }
        } else {
            console.log('ℹ️ Non-payment webhook type:', type);
        }
        
        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ 
            received: true,
            processed: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        
        // Still respond with 200 to prevent retries for unrecoverable errors
        res.status(200).json({ 
            received: true,
            processed: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test webhook endpoint
router.post('/test', (req, res) => {
    console.log('🧪 Test webhook received:', req.body);
    res.json({
        message: 'Test webhook received successfully',
        body: req.body,
        timestamp: new Date().toISOString()
    });
});

// Webhook status endpoint
router.get('/status', (req, res) => {
    res.json({
        status: 'active',
        service: 'Concurso Turbo IA Webhooks',
        endpoints: {
            mercadopago: '/api/webhooks/mercadopago',
            test: '/api/webhooks/test'
        },
        timestamp: new Date().toISOString()
    });
});

// Generate temporary password
function generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

module.exports = router;

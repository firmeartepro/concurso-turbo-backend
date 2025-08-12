const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { savePayment, updatePayment } = require('../models/database');
const { sendConfirmationEmail } = require('../services/email');
const router = express.Router();

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { 
        timeout: 10000,
        idempotencyKey: 'concurso-turbo-' + Date.now()
    }
});

const payment = new Payment(client);

// Process payment endpoint
router.post('/process', async (req, res) => {
    console.log('🚀 Payment processing started:', new Date().toISOString());
    
    try {
        const {
            token,
            paymentMethodId,
            issuerId,
            email,
            amount,
            installments,
            identificationNumber,
            identificationType,
            description,
            plan,
            customer_name,
            metadata
        } = req.body;

        console.log('📋 Payment data received:', {
            email: email || 'missing',
            amount: amount || 'missing',
            plan: plan || 'missing',
            customer_name: customer_name || 'missing',
            paymentMethodId: paymentMethodId || 'missing'
        });

        // Validate required fields
        const requiredFields = ['token', 'email', 'amount', 'customer_name'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            return res.status(400).json({
                error: 'Missing required fields',
                missing: missingFields,
                received: Object.keys(req.body)
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                email: email
            });
        }

        // Generate external reference
        const externalReference = `TURBO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create payment body
        const paymentBody = {
            transaction_amount: Number(amount),
            token: token,
            description: description || `Concurso Turbo IA - Plano ${plan}`,
            installments: Number(installments) || 1,
            payment_method_id: paymentMethodId,
            issuer_id: issuerId,
            payer: {
                email: email,
                first_name: customer_name.split(' ')[0] || 'Cliente',
                last_name: customer_name.split(' ').slice(1).join(' ') || 'Turbo',
                identification: {
                    type: identificationType || 'CPF',
                    number: String(identificationNumber || '12345678909')
                }
            },
            metadata: {
                plan: plan || 'unknown',
                source: 'landing_page',
                customer_name: customer_name,
                timestamp: new Date().toISOString(),
                ...metadata
            },
            notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`,
            external_reference: externalReference
        };

        console.log('💳 Creating payment with Mercado Pago...');
        console.log('🔑 Using access token:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Present' : 'Missing');

        // Create payment with Mercado Pago
        const result = await payment.create({ body: paymentBody });
        
        console.log('✅ Payment created successfully:', {
            id: result.id,
            status: result.status,
            external_reference: externalReference
        });

        // Prepare payment record for database
        const paymentRecord = {
            id: result.id,
            external_reference: externalReference,
            status: result.status,
            status_detail: result.status_detail,
            amount: result.transaction_amount,
            installments: result.installments,
            payment_method: result.payment_method_id,
            customer_email: email,
            customer_name: customer_name,
            customer_document: identificationNumber,
            plan: plan,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: JSON.stringify(metadata || {})
        };

        // Save to database
        await savePayment(paymentRecord);
        console.log('💾 Payment saved to database');

        // Send confirmation email if approved
        if (result.status === 'approved') {
            console.log('📧 Sending confirmation email...');
            try {
                await sendConfirmationEmail({
                    email: email,
                    name: customer_name,
                    plan: plan,
                    amount: amount,
                    transaction_id: result.id,
                    external_reference: externalReference
                });
                console.log('✅ Confirmation email sent successfully');
            } catch (emailError) {
                console.error('❌ Email sending failed:', emailError.message);
                // Don't fail the payment if email fails
            }
        }

        // Return success response
        res.json({
            success: true,
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
            external_reference: externalReference,
            payment_method_id: result.payment_method_id,
            installments: result.installments,
            transaction_amount: result.transaction_amount,
            created_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Payment processing error:', {
            message: error.message,
            status: error.status,
            cause: error.cause,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        // Handle specific Mercado Pago errors
        if (error.status === 400) {
            return res.status(400).json({
                error: 'Payment validation failed',
                message: error.message,
                details: error.cause || 'Invalid payment data'
            });
        }
        
        if (error.status === 401) {
            return res.status(500).json({
                error: 'Payment service configuration error',
                message: 'Invalid credentials'
            });
        }

        res.status(500).json({
            error: 'Payment processing failed',
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        console.log('🔍 Getting payment status for:', paymentId);
        
        const result = await payment.get({ id: paymentId });
        
        res.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
            external_reference: result.external_reference,
            transaction_amount: result.transaction_amount,
            date_created: result.date_created
        });
        
    } catch (error) {
        console.error('❌ Payment status error:', error);
        res.status(500).json({ 
            error: 'Failed to get payment status',
            message: error.message 
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        message: 'Payment API is working',
        timestamp: new Date().toISOString(),
        mercadopago_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN
    });
});

module.exports = router;

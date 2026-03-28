# UptimeRobot Keep-Alive Setup

Render free-tier services spin down after 15 minutes of inactivity.
Configure UptimeRobot to ping each service every 10 minutes.

## Setup Steps

1. Go to https://uptimerobot.com and create a free account
2. Click "Add New Monitor" for each service:

| Monitor Name | URL | Interval |
|---|---|---|
| OMS Gateway | https://oms-gateway.onrender.com/health | 10 min |
| OMS Auth | https://oms-auth-service.onrender.com/health | 10 min |
| OMS Orders | https://oms-orders-service.onrender.com/health | 10 min |
| OMS Labels | https://oms-label-service.onrender.com/health | 10 min |
| OMS Walmart | https://oms-walmart-service.onrender.com/health | 10 min |

Replace URLs with your actual Render service URLs.

## Supabase Keep-Alive

Supabase pauses projects after 7 days of inactivity on the free tier.
Configure a cron job at https://cron-job.org to call any service health
endpoint every 3 days.

## Alert Configuration

Set up email alerts in UptimeRobot so you're notified when any service
goes down (separate from keep-alive pings).

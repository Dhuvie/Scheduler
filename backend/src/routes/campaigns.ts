import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createCampaign } from '../services/scheduler';
import { prisma } from '../lib/prisma';

const router = Router();


const CreateCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  bodyTemplate: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient required'),
  startTime: z.string().datetime('Invalid start time'),
  delayBetweenMs: z.number().int().min(0, 'Delay must be non-negative').default(2000),
  hourlyLimit: z.number().int().min(1, 'Hourly limit must be at least 1').default(100),
  sender: z.string().email('Invalid sender email'),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
    }

    const { startTime, ...rest } = parsed.data;
    const campaign = await createCampaign({
      ...rest,
      startTime: new Date(startTime),
    });

    return res.status(201).json({
      id: campaign.id,
      subject: campaign.subject,
      sender: campaign.sender,
      recipientCount: campaign.recipientCount,
      startTime: campaign.startTime,
      delayBetweenMs: campaign.delayBetweenMs,
      hourlyLimit: campaign.hourlyLimit,
      status: campaign.status,
      createdAt: campaign.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { emails: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    
    const statusCounts = await prisma.email.groupBy({
      by: ['status'],
      where: { campaignId: req.params.id },
      _count: { status: true },
    });

    const statusMap = statusCounts.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count.status }),
      {} as Record<string, number>,
    );

    return res.json({
      ...campaign,
      emailStatusCounts: statusMap,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, parseInt(req.query.limit as string || '20', 10));
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (req.query.sender) {
      where.sender = req.query.sender as string;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { emails: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return res.json({
      data: campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

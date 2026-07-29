import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const VALID_STATUSES = ['pending', 'scheduled', 'sending', 'sent', 'failed', 'rescheduled'];

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit as string || '20', 10));
    const skip = (page - 1) * limit;
    const { status, campaignId, sender } = req.query;

    
    
    const where: any = {};

    if (status) {
      const statuses = (status as string).split(',').filter((s) => VALID_STATUSES.includes(s));
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    if (campaignId) {
      where.campaignId = campaignId as string;
    }

    if (sender) {
      where.sender = sender as string;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledTime: 'asc' },
        include: {
          campaign: {
            select: { id: true, subject: true, sender: true },
          },
        },
      }),
      prisma.email.count({ where }),
    ]);

    return res.json({
      data: emails,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = await prisma.email.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: true,
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json(email);
  } catch (err) {
    next(err);
  }
});

export default router;

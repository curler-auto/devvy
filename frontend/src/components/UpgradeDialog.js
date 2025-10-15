import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';

export default function UpgradeDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="upgrade-dialog" data-testid="upgrade-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        <div className="upgrade-content">
          <div className="pricing-section">
            <div className="price-tag">
              <span className="price">$99</span>
              <span className="period">per user/year</span>
            </div>
            <p className="text-sm text-gray-400">
              Enterprise licensing available for 20-200 users
            </p>
          </div>

          <div className="features-list">
            <h3 className="text-sm font-semibold mb-3">Premium Features</h3>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Access to all premium tools</span>
            </div>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>API Testing & Advanced Tools</span>
            </div>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Unlimited tool instances</span>
            </div>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Priority support</span>
            </div>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Team collaboration features</span>
            </div>
            <div className="feature-item">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Floating license management (20-200 licenses)</span>
            </div>
          </div>

          <div className="upgrade-actions">
            <Button className="w-full upgrade-cta">
              Contact Sales for Enterprise License
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              License activation processed through our secure servers
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

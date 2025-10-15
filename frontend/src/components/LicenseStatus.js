import { Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LicenseStatus({ organization, onUpgrade }) {
  const isPremium = organization?.license_tier === 'premium';

  return (
    <div className="license-status" data-testid="license-status">
      {isPremium ? (
        <div className="license-badge premium">
          <Crown className="w-4 h-4" />
          <span>Premium</span>
          <span className="license-count">
            {organization.active_licenses}/{organization.max_licenses}
          </span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onUpgrade}
          className="upgrade-button"
          data-testid="upgrade-button"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Premium
        </Button>
      )}
    </div>
  );
}

import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader><CardTitle>Help Center</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>RT2RP help content is being limited to workflows that are verified in the current product.</p>
            <p>Use the labels and guidance inside each available trip screen for the features currently supported by your account and trip data.</p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { useT } from '@/hooks/use-t';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, Globe, Stethoscope, FileText, Plane, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Country {
  id: string;
  name: string;
  nameI18n: any;
  code: string;
  costEstimate: string | null;
}

interface VisaCategory {
  id: string;
  name: string;
  nameI18n: any;
  slug: string;
}

interface CalculatorClientProps {
  countries: Country[];
  categories: VisaCategory[];
  lang: string;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

export function CalculatorClient({ countries, categories, lang }: CalculatorClientProps) {
  const t = useT();

  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  // Expenses state
  const [baseFee, setBaseFee] = useState<number>(0);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(true);
  const [biometricsFee, setBiometricsFee] = useState<number>(85);
  const [hasMedical, setHasMedical] = useState<boolean>(false);
  const [medicalFee, setMedicalFee] = useState<number>(150);
  const [hasInsurance, setHasInsurance] = useState<boolean>(false);
  const [insuranceFee, setInsuranceFee] = useState<number>(300);
  const [hasTranslation, setHasTranslation] = useState<boolean>(true);
  const [translationFee, setTranslationFee] = useState<number>(50);
  const [hasFlight, setHasFlight] = useState<boolean>(false);
  const [flightFee, setFlightFee] = useState<number>(1000);
  const [otherFee, setOtherFee] = useState<number>(0);

  // Currency State
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'AFN'>('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1, EUR: 0.92, AFN: 70.5 });
  const [loadingRates, setLoadingRates] = useState(false);

  // Fetch exchange rates on mount
  useEffect(() => {
    async function fetchRates() {
      setLoadingRates(true);
      try {
        const res = await fetch('/api/visa-prep/exchange');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            setExchangeRates(data.rates);
          }
        }
      } catch (err) {
        console.error('Failed to load exchange rates', err);
      } finally {
        setLoadingRates(false);
      }
    }
    fetchRates();
  }, []);

  // Update base fee when country changes
  useEffect(() => {
    if (selectedCountryId) {
      const country = countries.find(c => c.id === selectedCountryId);
      if (country && country.costEstimate) {
        const match = country.costEstimate.match(/\d+/);
        if (match) {
          setBaseFee(parseInt(match[0], 10));
        }
      }
    }
  }, [selectedCountryId, countries]);

  const totalCostUSD = baseFee + 
    (hasBiometrics ? biometricsFee : 0) + 
    (hasMedical ? medicalFee : 0) + 
    (hasInsurance ? insuranceFee : 0) + 
    (hasTranslation ? translationFee : 0) + 
    (hasFlight ? flightFee : 0) + 
    (otherFee || 0);

  const convertCost = (usdAmount: number) => {
    if (currency === 'USD') return usdAmount;
    return usdAmount * (exchangeRates[currency] || 1);
  };

  const totalCost = convertCost(totalCostUSD);
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '؋';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fa-AF', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(val);
  };

  const getLocalizedName = (item: { name: string, nameI18n: any }) => {
    if (item.nameI18n && typeof item.nameI18n === 'object' && item.nameI18n[lang]) {
      return item.nameI18n[lang];
    }
    return item.name;
  };

  const chartData = [
    { name: t('visaPrep.calc.baseFee') || 'Visa Fee', value: convertCost(baseFee) },
    ...(hasBiometrics ? [{ name: t('visaPrep.calc.biometrics') || 'Biometrics', value: convertCost(biometricsFee) }] : []),
    ...(hasMedical ? [{ name: t('visaPrep.calc.medical') || 'Medical', value: convertCost(medicalFee) }] : []),
    ...(hasInsurance ? [{ name: t('visaPrep.calc.insurance') || 'Insurance', value: convertCost(insuranceFee) }] : []),
    ...(hasTranslation ? [{ name: t('visaPrep.calc.translation') || 'Translation', value: convertCost(translationFee) }] : []),
    ...(hasFlight ? [{ name: t('visaPrep.calc.flight') || 'Flight', value: convertCost(flightFee) }] : []),
    ...(otherFee > 0 ? [{ name: t('visaPrep.calc.other') || 'Other', value: convertCost(otherFee) }] : []),
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Configuration Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {t('visaPrep.calc.visaType') || 'Select Application Type'}
            </CardTitle>
            <CardDescription>{t('visaPrep.calc.subtitle') || 'Choose your destination and visa type to populate estimates.'}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('visaPrep.calc.country') || 'Country'}</Label>
              <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('visaPrep.calc.country') || 'Select country'} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.id} value={country.id}>
                      {getLocalizedName(country)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('visaPrep.calc.visaType') || 'Visa Type'}</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('visaPrep.calc.visaType') || 'Select visa type'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {getLocalizedName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">Currency {loadingRates && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}</Label>
              <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="AFN">AFN (؋)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('visaPrep.calc.title') || 'Cost Breakdown (USD based)'}
            </CardTitle>
            <CardDescription>Enter costs in USD. They will be converted to your selected currency automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <Label className="font-semibold text-slate-700 dark:text-slate-200">{t('visaPrep.calc.baseFee') || 'Base Application Fee'} ($)</Label>
                <Input 
                  type="number" 
                  value={baseFee || ''} 
                  onChange={(e) => setBaseFee(parseInt(e.target.value) || 0)} 
                  placeholder="0"
                  className="text-lg font-medium bg-white dark:bg-slate-950"
                />
              </div>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <Label className="font-semibold text-slate-700 dark:text-slate-200">{t('visaPrep.calc.other') || 'Other Expenses'} ($)</Label>
                <Input 
                  type="number" 
                  value={otherFee || ''} 
                  onChange={(e) => setOtherFee(parseInt(e.target.value) || 0)} 
                  placeholder="0"
                  className="text-lg font-medium bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-5 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Variable Expenses</h3>
              
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                    <Globe className="h-5 w-5" />
                  </div>
                  <Label className="text-base cursor-pointer" onClick={() => setHasBiometrics(!hasBiometrics)}>
                    {t('visaPrep.calc.biometrics') || 'Biometrics'}
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={biometricsFee} 
                      onChange={(e) => setBiometricsFee(parseInt(e.target.value) || 0)} 
                      className="w-28 pl-7 font-medium"
                      disabled={!hasBiometrics}
                    />
                  </div>
                  <Switch checked={hasBiometrics} onCheckedChange={setHasBiometrics} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <Label className="text-base cursor-pointer" onClick={() => setHasMedical(!hasMedical)}>
                    {t('visaPrep.calc.medical') || 'Medical Exam'}
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={medicalFee} 
                      onChange={(e) => setMedicalFee(parseInt(e.target.value) || 0)} 
                      className="w-28 pl-7 font-medium"
                      disabled={!hasMedical}
                    />
                  </div>
                  <Switch checked={hasMedical} onCheckedChange={setHasMedical} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <Label className="text-base cursor-pointer" onClick={() => setHasInsurance(!hasInsurance)}>
                    {t('visaPrep.calc.insurance') || 'Health Insurance'}
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={insuranceFee} 
                      onChange={(e) => setInsuranceFee(parseInt(e.target.value) || 0)} 
                      className="w-28 pl-7 font-medium"
                      disabled={!hasInsurance}
                    />
                  </div>
                  <Switch checked={hasInsurance} onCheckedChange={setHasInsurance} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Label className="text-base cursor-pointer" onClick={() => setHasTranslation(!hasTranslation)}>
                    {t('visaPrep.calc.translation') || 'Document Translation'}
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={translationFee} 
                      onChange={(e) => setTranslationFee(parseInt(e.target.value) || 0)} 
                      className="w-28 pl-7 font-medium"
                      disabled={!hasTranslation}
                    />
                  </div>
                  <Switch checked={hasTranslation} onCheckedChange={setHasTranslation} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-md">
                    <Plane className="h-5 w-5" />
                  </div>
                  <Label className="text-base cursor-pointer" onClick={() => setHasFlight(!hasFlight)}>
                    {t('visaPrep.calc.flight') || 'Flight Tickets'}
                  </Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={flightFee} 
                      onChange={(e) => setFlightFee(parseInt(e.target.value) || 0)} 
                      className="w-28 pl-7 font-medium"
                      disabled={!hasFlight}
                    />
                  </div>
                  <Switch checked={hasFlight} onCheckedChange={setHasFlight} />
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="sticky top-24 shadow-xl border-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 z-0"></div>
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay z-0"></div>
          <CardHeader className="relative z-10 text-white pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('visaPrep.calc.total') || 'Total Estimate'}
              </span>
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">{currency}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 text-white">
            <div className="flex flex-col items-center py-6">
              <span className="text-5xl font-extrabold tracking-tighter drop-shadow-sm">
                {formatCurrency(totalCost)}
              </span>
              {currency !== 'USD' && (
                <span className="text-sm opacity-80 mt-2 font-medium">
                  ≈ {formatCurrency(totalCostUSD)} USD
                </span>
              )}
            </div>
            
            {chartData.length > 0 && (
              <div className="h-48 w-full mt-2 bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="space-y-3 mt-6 text-sm font-medium opacity-95">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-white/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="relative z-10 pt-4 pb-6 flex flex-col gap-4">
            <Button variant="secondary" className="w-full font-semibold shadow-sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Save / Print Estimate
            </Button>
            <p className="text-xs text-white/70 text-center leading-relaxed px-2">
              {t('visaPrep.calc.disclaimer') || 'This is an estimate only. Actual costs may vary based on exact consulate requirements and changing exchange rates.'}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

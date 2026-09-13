import {
  Briefcase, Scale, Plane, Languages, Lightbulb, Wallet, Users, Globe,
  CheckCircle, Phone, Mail, MessageCircle, Facebook, Instagram, Send,
  Linkedin, Youtube, Clock, MapPin, Award, Shield, Zap, TrendingUp,
  FileText, GraduationCap, BriefcaseBusiness, Building2, CreditCard,
  Laptop, Bot, Megaphone, Rocket, Printer,
  type LucideIcon,
} from 'lucide-react';

const map: Record<string, LucideIcon> = {
  Briefcase, Scale, Plane, Languages, Lightbulb, Wallet, Users, Globe,
  CheckCircle, Phone, Mail, MessageCircle, Facebook, Instagram, Send,
  Linkedin, Youtube, Clock, MapPin, Award, Shield, Zap, TrendingUp,
  FileText, GraduationCap, BriefcaseBusiness, Building2, CreditCard,
  Laptop, Bot, Megaphone, Rocket, Printer,
};

export function Icon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Cmp = (name && map[name]) || CheckCircle;
  return <Cmp className={className} />;
}

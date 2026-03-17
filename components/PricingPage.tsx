import React, { useState, useEffect } from 'react';
import { Check, X, ArrowLeft, Zap, Star, Sparkles, Building2, Loader2, Plus, Minus, ShieldCheck, CreditCard, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { GlobalSettings, UserSubscription } from '../types';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left group transition-all"
            >
                <span className={`text-base font-semibold transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {question}
                </span>
                <div className={`p-1.5 rounded-full transition-all ${isOpen ? 'bg-indigo-50 text-indigo-600 rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}>
                <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pricing, setPricing] = useState<GlobalSettings['pricing']>({
      pro: { monthly: 19, yearly: 15 },
      agency: { monthly: 49, yearly: 39 }
  });
  const [dbClientId, setDbClientId] = useState<string | null>(null);

  useEffect(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
      });

      const docRef = doc(db, "settings", "global");
      const unsubscribeSettings = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as GlobalSettings;
              if (data.pricing) {
                  setPricing(data.pricing);
              }
              if (data.paypal?.clientId) {
                  setDbClientId(data.paypal.clientId);
              }
          }
      }, (error) => {
          console.warn("Failed to subscribe to pricing updates:", error);
      });

      return () => {
          unsubscribeAuth();
          unsubscribeSettings();
      };
  }, []);

  const handlePaymentSuccess = async (planName: string) => {
      if (!user) return;

      const days = billingCycle === 'monthly' ? 30 : 365;
      const periodEnd = Date.now() + (days * 24 * 60 * 60 * 1000);
      
      const subscription: UserSubscription = {
          plan: planName.toLowerCase().includes('pro') ? 'pro' : 'agency',
          status: 'active',
          periodEnd: periodEnd
      };

      try {
          await updateDoc(doc(db, "users", user.uid), {
              subscription: subscription
          });
          alert(`Success! Your ${planName} subscription is now active.`);
          navigate('/dashboard');
      } catch (error) {
          console.error("Error updating subscription:", error);
          alert("Payment successful, but we failed to update your account. Please contact support.");
      }
  };

  const tiers = [
    {
      name: "Starter",
      description: "Experience the engine. Perfect for testing.",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Local Storage Workstation",
        "Basic Web Scraper",
        "Manual Pin Editing",
        "Standard CSV Export",
        "1 Workspace Slot",
        "300 Pins/month Limit",
        "Community Support"
      ],
      notIncluded: [
        "AI Auto-Fill Automation",
        "Stealth Mode Engine",
        "Webhook Integrations",
        "Multi-Account Variations"
      ],
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      color: "amber",
      cta: "Get Started Free",
      highlight: false
    },
    {
      name: "Pro Elite",
      description: "For serious growers who need volume & safety.",
      price: pricing.pro, 
      features: [
        "Everything in Starter",
        "AI Auto-Fill Automation",
        "Stealth Mode (Anti-Ban Engine)",
        "Smart Remix (One-Click Variations)",
        "5 Workspace Slots",
        "5,000 Pins/month Limit",
        "Priority Support"
      ],
      notIncluded: [
        "External Webhook Sync",
        "Google Sheets Integration"
      ],
      icon: <Sparkles className="w-5 h-5 text-white" />,
      color: "indigo",
      cta: "Upgrade to Pro",
      highlight: true
    },
    {
      name: "Agency",
      description: "Full control. Automate entire pipelines.",
      price: pricing.agency,
      features: [
        "Everything in Pro",
        "Unlimited Workspace Slots",
        "Advanced Webhook Integrations",
        "Google Sheets Live Sync",
        "Custom CSV Headers",
        "Dedicated Account Manager",
        "50,000 Pins/month Limit"
      ],
      notIncluded: [],
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
      color: "emerald",
      cta: "Get Agency Access",
      highlight: false
    }
  ];

  const faqs = [
    {
        question: "What are Workspace Slots?",
        answer: "A Workspace Slot allows you to connect a unique destination (like a Google Sheet or n8n webhook) for your pins. The Starter plan includes 1 slot, Pro Elite includes 5, and Agency is unlimited."
    },
    {
        question: "How do AI Credits work?",
        answer: "Auto-Fill uses AI to generate optimized titles and descriptions. Once generated for a pin, it becomes your 'Source of Truth.' Switching accounts or remixing then uses our free local engine to create unique variants, saving you credits!"
    },
    {
        question: "What is the Stealth Mode Engine?",
        answer: "Every time you export a pin for a different account, our engine applies unique metadata filtering and image invisible-processing to ensure Pinterest doesn't flag your content as duplicate across multiple accounts."
    },
    {
        question: "Can I upgrade or cancel at any time?",
        answer: "Yes! You can upgrade to a higher tier at any time and your billing will be adjusted. You can also cancel your recurring subscription whenever you like from your dashboard settings."
    }
  ];

  if (loading) {
      return (
          <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
      );
  }

  const finalClientId = dbClientId || import.meta.env.VITE_PAYPAL_CLIENT_ID || "AVKxhbNoMp_nwz0By87SWAtd9QIAFsZzpkD7RUux9HJ7moWfUzjrK2B7JsTUEw5bwhQHDyno13zydoIy";

  return (
    <PayPalScriptProvider key={finalClientId} options={{ clientId: finalClientId }}>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col items-center py-12 px-6 overflow-y-auto font-sans selection:bg-indigo-100 selection:text-indigo-900 custom-scrollbar">
         
         <div className="w-full max-w-6xl relative z-10 pb-20">
             {/* Simple Nav */}
             <div className="flex justify-between items-center mb-20">
                 <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
                 >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                 </button>
                 
                 <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
                        <Logo className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">Pinlly</span>
                 </div>
             </div>

             {/* Dynamic Header */}
             <div className="text-center max-w-2xl mx-auto mb-16">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6 border border-indigo-100">
                    <ShieldCheck className="w-3 h-3" /> Secure Automation
                 </div>
                 <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
                     Powerful plans for <span className="text-indigo-600">infinite scale.</span>
                 </h1>
                 <p className="text-slate-500 text-lg font-medium leading-relaxed">
                     Automate your Pinterest Empire with precision. Choose the tier that fits your growth stage.
                 </p>
             </div>

             {/* Billing Toggle (Smooth) */}
             <div className="flex flex-col items-center mb-16 gap-4">
                 <div className="bg-white p-1 rounded-2xl border border-slate-200 flex items-center shadow-sm">
                     <button
                         onClick={() => setBillingCycle('monthly')}
                         className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                     >
                         Monthly
                     </button>
                     <button
                         onClick={() => setBillingCycle('yearly')}
                         className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                     >
                         Yearly 
                         <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">Save 20%</span>
                     </button>
                 </div>
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Cancel Anytime
                 </p>
             </div>

             {/* Pricing Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-32">
                 {tiers.map((tier) => {
                     const isPro = tier.highlight;
                     const price = billingCycle === 'monthly' ? tier.price.monthly : tier.price.yearly;
                     return (
                         <div 
                             key={tier.name}
                             className={`
                                 relative rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col
                                 ${isPro 
                                     ? 'bg-white border-2 border-indigo-600 shadow-[0_32px_64px_-12px_rgba(79,70,229,0.15)] scale-[1.05] z-10' 
                                     : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:border-slate-300'
                                 }
                             `}
                         >
                             {isPro && (
                                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                     <Star className="w-3 h-3 fill-white" /> Recommended
                                 </div>
                             )}

                             <div className="mb-8">
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${
                                     isPro ? 'bg-indigo-600 text-white' : `bg-slate-50 border border-slate-100`
                                 }`}>
                                     {tier.icon}
                                 </div>
                                 <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase italic">{tier.name}</h3>
                                 <p className="text-sm text-slate-500 font-medium leading-normal">{tier.description}</p>
                             </div>

                             <div className="mb-8">
                                 <div className="flex items-baseline gap-1">
                                     <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                         ${price}
                                     </span>
                                     <span className="text-slate-400 font-bold text-lg">/mo</span>
                                 </div>
                                 {billingCycle === 'yearly' && tier.price.monthly > 0 && (
                                     <p className="text-[10px] text-emerald-600 mt-2 font-black uppercase tracking-wider">
                                         Billed ${tier.price.yearly * 12} Yearly
                                     </p>
                                 )}
                             </div>

                             <div className="mb-10 flex-grow">
                                 {price > 0 ? (
                                     !user ? (
                                         <button 
                                             onClick={() => navigate('/auth')}
                                             className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-slate-900 shadow-xl shadow-indigo-100"
                                         >
                                             Login to Start
                                         </button>
                                     ) : (
                                         <PayPalButtons 
                                             style={{ layout: "vertical", shape: "rect", label: "pay", color: isPro ? "blue" : "black" }}
                                             createOrder={(data, actions) => {
                                                 return actions.order.create({
                                                     intent: "CAPTURE",
                                                     purchase_units: [{
                                                         amount: {
                                                             currency_code: 'USD',
                                                             value: price.toString(),
                                                         },
                                                     }],
                                                     application_context: {
                                                         shipping_preference: "NO_SHIPPING"
                                                     }
                                                 });
                                             }}
                                             onApprove={(data, actions) => {
                                                 return actions.order!.capture().then((details) => {
                                                     handlePaymentSuccess(tier.name);
                                                 });
                                             }}
                                         />
                                     )
                                 ) : (
                                     <button 
                                         onClick={() => {
                                             if (!user) navigate('/auth');
                                             else navigate('/dashboard');
                                         }}
                                         className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200/50 italic"
                                     >
                                         {user ? "View Dashboard" : tier.cta}
                                     </button>
                                 )}
                             </div>

                             <div className="space-y-4">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Key Features</p>
                                 <ul className="space-y-3.5">
                                     {tier.features.map(feature => (
                                         <li key={feature} className="flex items-start gap-4 text-xs font-bold text-slate-600">
                                             <div className={`mt-0.5 p-0.5 rounded-full ${isPro ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Check className="w-3 h-3" />
                                             </div>
                                             <span className="leading-tight">{feature}</span>
                                         </li>
                                     ))}
                                     {tier.notIncluded.map(feature => (
                                         <li key={feature} className="flex items-start gap-4 text-xs font-bold text-slate-300">
                                             <div className="mt-0.5 p-0.5 rounded-full bg-slate-50 text-slate-200">
                                                <X className="w-3 h-3" />
                                             </div>
                                             <span className="leading-tight line-through decoration-slate-200">{feature}</span>
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         </div>
                     );
                 })}
             </div>

             {/* FAQ Section */}
             <div className="max-w-3xl mx-auto mb-32">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-100 text-slate-900 mb-4">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 italic tracking-tight uppercase">Commonly Asked</h2>
                    <p className="text-slate-500 text-sm font-medium">Everything you need to know about the platform and billing.</p>
                </div>
                
                <div className="bg-white rounded-[2rem] border border-slate-200 px-8 py-4 shadow-xl shadow-slate-200/40">
                    {faqs.map((faq, i) => (
                        <FAQItem key={i} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
             </div>

             {/* Support Strip */}
             <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 transform hover:-translate-y-1 transition-transform shadow-2xl">
                 <div className="text-center md:text-left">
                     <h3 className="text-2xl font-black mb-2 tracking-tight italic uppercase">High Volume Enterprise?</h3>
                     <p className="text-slate-400 text-sm font-medium">Custom API access, white-labeling, and dedicated server pipelines.</p>
                 </div>
                 <button 
                    onClick={() => window.location.href = "mailto:support@pinlly.pro"} 
                    className="px-8 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl"
                 >
                     Talk to Sales
                 </button>
             </div>

             <div className="mt-16 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                 © {new Date().getFullYear()} Pinlly Engine. Secure Payments via PayPal.
             </div>
         </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default PricingPage;

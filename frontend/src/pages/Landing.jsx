import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Rocket, Brain, Sparkles, Users, CheckCircle, 
    Zap, Shield, BarChart3, ArrowRight,
    Mail, HelpCircle, Star,
    Check
} from 'lucide-react';

const Landing = () => {
    React.useEffect(() => {
        document.title = 'AI Hiring OS | Smart Recruitment';
    }, []);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const stagger = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-inter selection:bg-indigo-100 selection:text-indigo-700">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-violet-100/50 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[20%] w-[25%] h-[25%] bg-blue-100/50 blur-[100px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 md:px-12 z-50 glass-morphism border-b border-white/20">
                <div className="font-extrabold text-2xl flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Rocket className="text-white" size={24} />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI Hiring OS</span>
                </div>
                
                <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
                    <button onClick={() => scrollToSection('features')} className="hover:text-indigo-600 transition-colors">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="hover:text-indigo-600 transition-colors">How it Works</button>
                    <button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-600 transition-colors">Pricing</button>
                    <button onClick={() => scrollToSection('api')} className="hover:text-indigo-600 transition-colors">API</button>
                    <button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 transition-colors">FAQ</button>
                </div>

                <div className="flex gap-4 items-center">
                    <Link to="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Login</Link>
                    <Link to="/signup" className="btn btn-primary shadow-xl shadow-indigo-600/20">Get Started</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-24 px-6 text-center z-10 max-w-5xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold mb-8 border border-indigo-100 shadow-sm"
                >
                    <Sparkles size={16} />
                    <span>v2.0 is now live with LLM-powered evaluations</span>
                </motion.div>
                
                <motion.h1 
                    {...fadeIn}
                    className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1] text-slate-900"
                >
                    The Smart Way to <br />
                    <span className="gradient-text italic">Build Your Dream Team.</span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                    Stop drowning in resumes. Our AI-driven engine scores, analyzes, and shortlists top talent in seconds, so you can focus on what matters: people.
                </motion.p>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="flex flex-wrap gap-4 justify-center"
                >
                    <Link to="/signup" className="btn btn-primary px-10 py-4 text-lg shadow-2xl shadow-indigo-600/30">
                        Start Hiring for Free
                        <ArrowRight size={20} />
                    </Link>
                </motion.div>

                {/* Social Proof */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 pt-10 border-t border-slate-200/50"
                >
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Trusted by industry leaders</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="text-xl font-bold flex items-center gap-1"><Zap fill="currentColor" /> TechFlow</div>
                        <div className="text-xl font-bold flex items-center gap-1"><Shield fill="currentColor" /> SecureBase</div>
                        <div className="text-xl font-bold flex items-center gap-1"><Brain fill="currentColor" /> MindSet</div>
                        <div className="text-xl font-bold flex items-center gap-1"><Star fill="currentColor" /> Nova</div>
                    </div>
                </motion.div>
            </header>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 bg-white relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Core Capabilities</h2>
                        <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Everything you need to hire faster.</h3>
                    </div>

                    <motion.div 
                        variants={stagger}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {[
                            { icon: Brain, title: "AI Resume Scoring", desc: "Our engine reads between the lines, identifying semantic matches that keyword filters miss." },
                            { icon: Sparkles, title: "Smart Shortlisting", desc: "Instantly identify the top 5% of candidates based on custom job requirements." },
                            { icon: Shield, title: "Multi-Role RBAC", desc: "Granular permissions for Admins, HR Managers, Hiring Managers, and Interviewers." },
                            { icon: BarChart3, title: "Insightful Analytics", desc: "Track hiring funnel efficiency, source quality, and time-to-hire in real-time." },
                            { icon: Users, title: "Collaborative Hiring", desc: "Share feedback, scorecards, and candidate notes across the entire hiring team." },
                            { icon: CheckCircle, title: "Compliance Ready", desc: "Built with data privacy and fair hiring practices at the core of every algorithm." }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                variants={fadeIn}
                                className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-indigo-600/20">
                                    <feature.icon size={28} />
                                </div>
                                <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How it Works */}
            <section id="how-it-works" className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">The Workflow</h2>
                            <h3 className="text-4xl font-bold text-slate-900 tracking-tight mb-8">From JD to Hire in 3 Simple Steps.</h3>
                            
                            <div className="space-y-8">
                                {[
                                    { step: "01", title: "Create Your Job Post", desc: "Define the role, required skills, and weightage for different evaluation criteria." },
                                    { step: "02", title: "Upload & Parse Resumes", desc: "Drag and drop resumes in any format. Our AI extracts and structures data instantly." },
                                    { step: "03", title: "Evaluate & Shortlist", desc: "Review AI-generated scores and insights. Move candidates through the pipeline with one click." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6">
                                        <div className="text-4xl font-black text-indigo-100">{item.step}</div>
                                        <div>
                                            <h5 className="text-xl font-bold mb-2">{item.title}</h5>
                                            <p className="text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full max-w-md">
                            <div className="glass-morphism p-4 rounded-[2rem] shadow-2xl relative">
                                <div className="bg-white rounded-2xl p-6 shadow-inner border border-slate-100">
                                    {/* Mock Dashboard UI */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="w-32 h-4 bg-slate-100 rounded-full" />
                                        <div className="w-10 h-10 bg-indigo-50 rounded-full" />
                                    </div>
                                    <div className="space-y-4">
                                        {[85, 92, 78].map((score, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-50 bg-slate-50/50">
                                                <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="w-24 h-3 bg-slate-200 rounded-full" />
                                                    <div className="w-full h-2 bg-slate-100 rounded-full" />
                                                </div>
                                                <div className="font-black text-indigo-600 text-lg">{score}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute -bottom-6 -right-6 bg-indigo-600 text-white p-6 rounded-3xl shadow-xl animate-bounce duration-3000">
                                    <div className="text-xs font-bold uppercase mb-1">Top Match</div>
                                    <div className="text-xl font-black">Sarah Chen</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 bg-slate-900 text-white relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Pricing Plans</h2>
                        <h3 className="text-4xl font-bold tracking-tight">Scale your hiring without breaking the bank.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { name: "Starter", price: "$0", desc: "Perfect for small teams and startups.", features: ["Up to 3 Active Jobs", "50 AI Evaluations/mo", "Standard Analytics", "Email Support"] },
                            { name: "Professional", price: "$99", desc: "Designed for growing companies.", features: ["Unlimited Jobs", "500 AI Evaluations/mo", "Advanced AI Insights", "Priority Support", "Custom Branding"], popular: true },
                            { name: "Enterprise", price: "Custom", desc: "Tailored for large-scale operations.", features: ["Unlimited Everything", "Custom AI Training", "SLA & Security Audit", "Dedicated Account Manager", "API Full Access"] }
                        ].map((plan, i) => (
                            <div 
                                key={i}
                                className={`p-10 rounded-[2.5rem] border ${plan.popular ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5'} relative flex flex-col`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-widest">
                                        Most Popular
                                    </div>
                                )}
                                <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                                <div className="text-4xl font-black mb-4">{plan.price}<span className="text-lg font-normal text-white/50">{plan.price !== 'Custom' && '/mo'}</span></div>
                                <p className="text-white/60 mb-8 text-sm">{plan.desc}</p>
                                <div className="space-y-4 mb-10 flex-1">
                                    {plan.features.map((feat, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <Check className="text-indigo-400" size={16} />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className={`btn w-full justify-center py-4 ${plan.popular ? 'btn-primary' : 'bg-white/10 hover:bg-white/20'}`}>
                                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* API & Integrations */}
            <section id="api" className="py-24 px-6 bg-white relative">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 order-2 md:order-1">
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl font-mono text-sm text-indigo-300 border border-white/10">
                            <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <div className="space-y-2">
                                <p><span className="text-pink-400">POST</span> /api/v1/evaluate</p>
                                <p className="text-slate-500">{'{'}</p>
                                <p className="pl-4">"resume_url": <span className="text-green-400">"https://storage.com/resume.pdf"</span>,</p>
                                <p className="pl-4">"job_id": <span className="text-green-400">"job_9283"</span></p>
                                <p className="text-slate-500">{'}'}</p>
                                <p className="pt-4 text-slate-500">// Response</p>
                                <p className="text-slate-500">{'{'}</p>
                                <p className="pl-4">"score": <span className="text-yellow-400">94</span>,</p>
                                <p className="pl-4">"match_summary": <span className="text-green-400">"Strong technical fit..."</span></p>
                                <p className="text-slate-500">{'}'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 order-1 md:order-2">
                        <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Built for Developers</h2>
                        <h3 className="text-4xl font-bold text-slate-900 tracking-tight mb-8">Powerful API for Seamless Integration.</h3>
                        <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                            Connect AI Hiring OS with your existing tools. Our robust REST API and webhooks allow you to automate evaluations directly within your custom workflow.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                                <CheckCircle className="text-indigo-600" size={18} />
                                RESTful Architecture
                            </div>
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                                <CheckCircle className="text-indigo-600" size={18} />
                                Webhook Support
                            </div>
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                                <CheckCircle className="text-indigo-600" size={18} />
                                Detailed Documentation
                            </div>
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                                <CheckCircle className="text-indigo-600" size={18} />
                                SDKs for JS, Python, Go
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-6 max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">FAQ</h2>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">Got questions? We've got answers.</h3>
                </div>
                <div className="space-y-4">
                    {[
                        { q: "How accurate is the AI scoring?", a: "Extremely. Our engine is trained on millions of data points and uses LLMs to understand context, not just keywords. It identifies skills and experience similar to how a human recruiter would." },
                        { q: "Can I integrate this with my existing ATS?", a: "Yes! Our Enterprise plan includes full API access and custom integrations with popular platforms like Workday, Greenhouse, and Lever." },
                        { q: "Is my data secure?", a: "Data security is our top priority. We use enterprise-grade encryption (AES-256) and are SOC2 Type II compliant. Your data is isolated and never used to train global models without consent." },
                        { q: "What file formats do you support?", a: "We support PDF, DOCX, and TXT files. Our parser handles complex layouts, tables, and diverse resume styles with high precision." }
                    ].map((item, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 transition-colors">
                            <h5 className="font-bold mb-2 flex items-center gap-2">
                                <HelpCircle size={18} className="text-indigo-600" />
                                {item.q}
                            </h5>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-600/40">
                    <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative z-10"
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to transform your hiring?</h2>
                        <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-12">
                            Join over 500+ companies using AI Hiring OS to build world-class teams without the manual grunt work.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link to="/signup" className="btn bg-white text-indigo-600 hover:bg-indigo-50 px-10 py-4 text-lg font-black">
                                Create Free Account
                            </Link>
                            <button className="btn border-white/20 bg-white/10 hover:bg-white/20 px-10 py-4 text-lg">
                                Talk to an Expert
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-200">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1">
                        <div className="font-extrabold text-2xl flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Rocket className="text-white" size={18} />
                            </div>
                            <span>AI Hiring OS</span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            The intelligent operating system for modern talent acquisition. Built for humans, powered by AI.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"><Mail size={18} /></a>
                        </div>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-400">Product</h6>
                        <ul className="space-y-4 text-sm font-semibold text-slate-600">
                            <li><button onClick={() => scrollToSection('features')} className="hover:text-indigo-600 transition-colors">Features</button></li>
                            <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-indigo-600 transition-colors">How it Works</button></li>
                            <li><button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-600 transition-colors">Pricing</button></li>
                            <li><button onClick={() => scrollToSection('api')} className="hover:text-indigo-600 transition-colors">API</button></li>
                            <li><button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 transition-colors">FAQ</button></li>
                        </ul>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-400">Company</h6>
                        <ul className="space-y-4 text-sm font-semibold text-slate-600">
                            <li><a href="#" className="hover:text-indigo-600 transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-indigo-600 transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-indigo-600 transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
                        </ul>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-400">Support</h6>
                        <ul className="space-y-4 text-sm font-semibold text-slate-600">
                            <li><button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 transition-colors">Help Center</button></li>
                            <li><button onClick={() => scrollToSection('api')} className="hover:text-indigo-600 transition-colors">API Docs</button></li>
                            <li><button onClick={() => scrollToSection('faq')} className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><Mail size={16} /> Get Support</button></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-400 text-xs italic">© 2026 AI Hiring OS. Designed with love for the future of work.</p>
                    <div className="flex gap-6 text-xs text-slate-400">
                        <a href="#" className="hover:underline">Terms</a>
                        <a href="#" className="hover:underline">Privacy</a>
                        <a href="#" className="hover:underline">Cookies</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;

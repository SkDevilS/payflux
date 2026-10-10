import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Menu, X, Terminal, ArrowRight, ShieldCheck, Zap, Code, FileJson, Server, Key, Globe, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

export default function Documentation() {
  const [copiedCode, setCopiedCode] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const CodeBlock = ({ code, id, title, language = "json" }) => (
    <div className="relative group my-6 rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-[#0f172a]">
      {title && (
        <div className="bg-[#1e293b] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Terminal className="h-4 w-4 text-slate-400" />
            {title}
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          </div>
        </div>
      )}
      <pre className="text-slate-300 p-5 overflow-x-auto font-mono text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-3 right-3 p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 text-slate-300 backdrop-blur-sm"
      >
        {copiedCode === id ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  const Table = ({ headers, rows }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {headers.map((h, i) => <th key={i} className="px-5 py-4 text-left font-bold text-slate-700 whitespace-nowrap text-xs uppercase tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-4 leading-relaxed ${j === 0 ? 'font-mono text-[13px] font-semibold text-indigo-600' :
                  j === 1 && headers[1] === 'Type' ? 'font-mono text-[12px] text-slate-500' :
                    j === 2 && cell === 'Required' ? 'text-xs font-bold text-rose-600 uppercase tracking-wide' :
                      'text-slate-600'
                  }`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const navItems = [
    { id: 'overview', title: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'token', title: '01 Token Generation', icon: <Key size={16} /> },
    { id: 'auth', title: '02 Authentication', icon: <ShieldCheck size={16} /> },
    { id: 'payin-create', title: '03 PayIn — Create Order', icon: <ArrowRight size={16} /> },
    { id: 'payout-direct', title: '04 PayOut — Direct Payout', icon: <ArrowRight size={16} /> },
    { id: 'payout-status', title: '05 PayOut — Check Status', icon: <CheckCircle2 size={16} /> },
    { id: 'ip-whitelist', title: '06 IP Whitelisting', icon: <Globe size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden p-4 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Code className="h-6 w-6 text-indigo-600" />
          <h1 className="font-bold text-lg text-slate-900">PAYSUDO Developers</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600 hover:text-slate-900 focus:outline-none bg-slate-100 p-2 rounded-md">
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-72 lg:w-[300px] bg-white border-r border-slate-200 h-[calc(100vh-73px)] md:h-screen sticky top-[73px] md:top-0 overflow-y-auto shrink-0 z-20 shadow-sm`}>
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-2">
              <Code className="h-6 w-6 text-indigo-600" />
              PAYSUDO API
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest border border-indigo-100">
              v1.1 — July 2026
            </div>
          </div>
          <nav className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">Contents</div>
            {navItems.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => {
                  setIsSidebarOpen(false);
                  setActiveSection(item.id);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-lg transition-all duration-200 ${activeSection === item.id
                  ? 'text-indigo-700 bg-indigo-50/80 border-transparent shadow-sm'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
              >
                <span className={activeSection === item.id ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                {item.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-16">

          {/* Header/Overview */}
          <section id="overview" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div>
              <div className="flex gap-3 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-full uppercase tracking-wider border border-rose-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Confidential
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full uppercase tracking-wider border border-slate-200">
                  HTTPS / TLS 1.2+
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                PAYSUDO Payment Gateway
              </h1>
              <p className="text-xl text-slate-500 font-medium mb-8 max-w-2xl leading-relaxed">
                Developer Reference for PayIn & PayOut integration. Follow this guide to authenticate and process payments seamlessly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Base URL</p>
                  <p className="font-mono text-slate-800 font-semibold">api.payflux.online</p>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Version</p>
                  <p className="font-medium text-slate-800">v1.1 — July 2026</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 01 */}
          <section id="token" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">01</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Token Generation</h2>
            </div>

            <p className="text-lg text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Call this endpoint first to obtain your Bearer JWT. This token must be included in every subsequent PayIn and PayOut API request. Without it, all calls return <code className="bg-slate-100 text-rose-500 px-1.5 py-0.5 rounded font-mono text-sm">401 Unauthorized</code>.
            </p>

            <div className="mt-8">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider w-fit">POST</span>
                <code className="text-[15px] font-mono text-slate-800 font-semibold break-all">https://api.payflux.online/api/merchant/login</code>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8">
                <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800">
                  <strong>NOTE:</strong> This is the only endpoint that does NOT require authentication headers.
                </p>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-4">Request Body</h3>
              <Table
                headers={['Field', 'Type', 'Required', 'Description']}
                rows={[
                  ['merchantId', 'String', 'Required', 'Your unique merchant ID provided during account registration'],
                  ['password', 'String', 'Required', 'Your merchant account password']
                ]}
              />

              <CodeBlock id="s1-req" title="Sample Request" code={`POST https://api.payflux.online/api/merchant/login
Content-Type: application/json

{
  "merchantId": "your_merchant_id",
  "password": "your_password"
}`} />

              <h3 className="text-xl font-bold text-slate-900 mt-10 mb-4">Response Fields</h3>
              <Table
                headers={['Field', 'Type', 'Description']}
                rows={[
                  ['success', 'Boolean', 'true if login succeeded, false otherwise'],
                  ['message', 'String', 'Human-readable status message'],
                  ['token', 'String', 'Bearer JWT — include in Authorization header on all calls'],
                  ['merchantId', 'String', 'Your merchant ID echoed back for confirmation'],
                  ['merchantName', 'String', 'Your registered business name'],
                  ['email', 'String', 'Registered email address for your merchant account']
                ]}
              />
              <CodeBlock id="s1-res" title="Sample Response" code={`{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "merchantId": "your_merchant_id",
  "merchantName": "Your Business Name",
  "email": "your@email.com"
}`} />

              <div className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-500 w-5 h-5" />
                  How to Use the Token
                </h3>
                <p className="text-[14px] text-slate-600 mb-6 leading-relaxed bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  Store your token securely in server-side memory or an encrypted store. Never expose it in URLs, browser localStorage, or client-side JavaScript. Tokens are short-lived — implement auto-refresh logic in production.
                </p>
                <ol className="space-y-4 text-[14px] text-slate-700 list-decimal pl-5 marker:text-indigo-500 marker:font-bold">
                  <li className="pl-2">Call <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[13px]">POST /api/merchant/login</code> with merchantId and password.</li>
                  <li className="pl-2">Extract the <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[13px]">token</code> field from the JSON response.</li>
                  <li className="pl-2">Add to every subsequent request:<br /><code className="bg-slate-800 text-emerald-400 px-2 py-1 rounded font-mono text-[13px] mt-2 inline-block shadow-sm">Authorization: Bearer eyJhbGciOiJIUzI1Ni...</code></li>
                  <li className="pl-2">If you receive <code className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-mono text-[13px] border border-rose-100">401 Unauthorized</code> — token expired, re-login.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section 02 */}
          <section id="auth" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">02</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Authentication & Headers</h2>
            </div>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl">
              Every Paysudo API call — PayIn and PayOut — must carry three credentials in HTTP headers. Omitting any one returns <code className="bg-slate-100 text-rose-500 px-1.5 py-0.5 rounded font-mono text-sm border border-slate-200">401 Unauthorized</code>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Key className="w-24 h-24 text-indigo-900" />
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Header 1</div>
                <h3 className="font-mono font-bold text-slate-900 text-[15px] mb-4">X-Authorization-Key</h3>
                <div className="mb-4">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Where to find it</p>
                  <p className="text-[12px] text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-200">Dashboard → Developer Zone → X-Authorization-Key</p>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">Unique key that identifies your merchant account. Never expose in client-side code.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <ShieldCheck className="w-24 h-24 text-indigo-900" />
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Header 2</div>
                <h3 className="font-mono font-bold text-slate-900 text-[15px] mb-4">X-Module-Secret</h3>
                <div className="mb-4">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Where to find it</p>
                  <p className="text-[12px] text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-200">Dashboard → Developer Zone → X-Module-Secret</p>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">Module-level secret that adds a second layer of security. Rotate periodically.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Server className="w-24 h-24 text-indigo-900" />
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Header 3</div>
                <h3 className="font-mono font-bold text-slate-900 text-[15px] mb-4">Authorization</h3>
                <div className="mb-4">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">Where to find it</p>
                  <p className="text-[12px] text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-200">Call POST /api/merchant/login</p>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">Prefix with 'Bearer ' (with a space). Re-login if you receive 401 Unauthorized.</p>
              </div>
            </div>

            <CodeBlock id="s2-req" title="Full Request Example — All 3 Headers" code={`POST https://api.payflux.online/api/payin/order/create
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Authorization-Key: your_authorization_key
X-Module-Secret: your_module_secret
Content-Type: application/json`} />
          </section>

          {/* Section 03 */}
          <section id="payin-create" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">03</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">PayIn — Create Order</h2>
            </div>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl">
              Initiate a payment collection from a customer. The request payload is sent as plain JSON — no encryption or decryption step is required.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider w-fit">POST</span>
              <code className="text-[15px] font-mono text-slate-800 font-semibold break-all">https://api.payflux.online/api/payin/order/create</code>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3 mb-10">
              <Zap className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-indigo-900">
                <strong>NOTE:</strong> Send the request body as standard JSON. No AES encryption is required for PayIn requests or responses.
              </p>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Request Parameters</h3>
            <Table
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['amount', 'Float', 'Required', 'Transaction amount in INR — e.g. 1000.00'],
                ['orderid', 'String', 'Required', 'Unique merchant-generated order ID'],
                ['payee_fname', 'String', 'Required', 'Customer first name'],
                ['payee_lname', 'String', 'Required', 'Customer last name'],
                ['payee_mobile', 'String', 'Required', 'Customer 10-digit mobile number'],
                ['payee_email', 'String', 'Required', 'Customer email address'],
                ['callbackurl', 'String', 'Required', 'Your HTTPS endpoint to receive payment status callbacks']
              ]}
            />

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4 mb-8">
              <p className="text-sm font-medium text-amber-800">
                <strong>Note:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">callbackurl</code> is mandatory on every request. Without it, the bank partner cannot send real-time payment confirmations to your server.
              </p>
            </div>

            <CodeBlock id="s3-req" title="Sample Request Body" code={`{
  "amount": 1000.00,
  "orderid": "ORDER123456789",
  "payee_fname": "John",
  "payee_lname": "Doe",
  "payee_mobile": "9876543210",
  "payee_email": "customer@example.com",
  "callbackurl": "https://yoursite.com/payin/callback"
}`} />

            <h3 className="text-xl font-bold text-slate-900 mt-12 mb-4">Response</h3>
            <p className="text-[15px] text-slate-600 mb-6 leading-relaxed">
              Upon successful order creation, Paysudo returns the transaction details together with a UPI payment string (upi_link / intent_url), which can be opened in any UPI app or rendered as a QR code to collect payment.
              Where the routing partner supports it, app-specific deep links (Paytm, PhonePe, CRED, BharatPe, MobiKwik) are also returned.
            </p>

            <CodeBlock id="s3-res" title="Sample Response" code={`{
  "data": {
    "amount": 100.0,
    "charge_amount": 0,
    "expires_in": 0,
    "intent_url": "upi://pay?pa=bbbsale-13759603.payu@indus&pn=BBB INFOTECH PRIVATE LIMITED&tr=31103943309&tid=PPPL311039433090510261132226ac33d6e&am=100.00&cu=INR&tn=UPIIntent",
    "net_amount": 96.5,
    "order_id": "O33454322345235544469",
    "payment_link": "upi://pay?pa=bbbsale-13759603.payu@indus&pn=BBB INFOTECH PRIVATE LIMITED&tr=31103943309&tid=PPPL311039433090510261132226ac33d6e&am=100.00&cu=INR&tn=UPIIntent",
    "payment_params": {},
    "pg_partner": "SINGPAY",
    "qr_code_url": "upi://pay?pa=bbbsale-13759603.payu@indus&pn=BBB INFOTECH PRIVATE LIMITED&tr=31103943309&tid=PPPL311039433090510261132226ac33d6e&am=100.00&cu=INR&tn=UPIIntent",
    "qr_string": "upi://pay?pa=bbbsale-13759603.payu@indus&pn=BBB INFOTECH PRIVATE LIMITED&tr=31103943309&tid=PPPL311039433090510261132226ac33d6e&am=100.00&cu=INR&tn=UPIIntent",
    "tiny_url": "",
    "txn_id": "SGP_7000000001_O33454322345235544469_1791180142",
    "upi_link": "upi://pay?pa=bbbsale-13759603.payu@indus&pn=BBB INFOTECH PRIVATE LIMITED&tr=31103943309&tid=PPPL311039433090510261132226ac33d6e&am=100.00&cu=INR&tn=UPIIntent",
    "vpa": ""
  },
  "message": "Order created successfully",
  "success": true
}`} />

            <Table
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['txn_id', 'String', 'Unique transaction ID assigned by Paysudo'],
                ['order_id', 'String', 'Your merchant order ID echoed back for confirmation'],
                ['amount', 'Float', 'Transaction amount requested'],
                ['charge_amount', 'Float', 'Gateway charges applied to the transaction'],
                ['net_amount', 'Float', 'Amount payable after charges'],
                ['Paytm', 'String', 'Deep link to open the Paytm app directly to the payment'],
                ['phonepe', 'String', 'Deep link to open the PhonePe app directly to the payment'],
                ['cred', 'String', 'Deep link to open the CRED app directly to the payment'],
                ['bharatpe', 'String', 'Deep link to open the BharatPe app directly to the payment'],
                ['mobikwik', 'String', 'Deep link to open the MobiKwik app directly to the payment'],
                ['qr_string / upi_link / payment_link / intent_url', 'String', 'UPI intent string — render as a QR code or open in a generic UPI app to collect payment (populated where applicable)'],
                ['expires_in', 'Integer', 'Seconds until this payment intent expires (0 = no expiry set)'],
                ['pg_partner', 'String', 'Underlying payment gateway partner routing this transaction']
              ]}
            />

            <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center gap-3">
                <FileJson className="text-indigo-500 w-6 h-6" />
                <h3 className="text-xl font-bold text-slate-900">
                  PayIn Webhook Callback
                </h3>
              </div>
              <div className="p-6 md:p-8">
                <p className="text-slate-600 leading-relaxed text-[15px] mb-6">
                  Once the customer completes payment, Paysudo sends a real-time POST notification to the callbackurl you supplied during order creation.
                </p>
                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center gap-4 mb-8 max-w-fit">
                  <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider">POST</span>
                  <span className="text-[14px] font-semibold text-slate-800 font-mono">your callbackurl</span>
                </div>

                <h4 className="font-bold text-slate-900 mb-4 text-lg">Webhook Fields</h4>
                <Table
                  headers={['Field', 'Type', 'Description']}
                  rows={[
                    ['txn_id', 'String', 'Unique transaction ID assigned by Paysudo'],
                    ['order_id', 'String', 'Your merchant order ID echoed back for confirmation'],
                    ['status', 'String', 'Final payment status: SUCCESS, PENDING, or FAILURE'],
                    ['amount', 'String', 'Transaction amount in INR (e.g. "100.00")'],
                    ['net_amount', 'String', 'Amount payable after charges, in INR'],
                    ['charge_amount', 'String', 'Gateway charges applied to the transaction, in INR'],
                    ['utr', 'String', 'Unique Transaction Reference number from the bank'],
                    ['pg_txn_id', 'String', 'Transaction ID assigned by the underlying payment gateway partner'],
                    ['payment_mode', 'String', 'Mode of payment used by the customer, e.g. UPI'],
                    ['timestamp', 'String', 'Time the transaction was processed, format YYYY-MM-DD HH:MM:SS']
                  ]}
                />

                <CodeBlock id="s3-webhook" title="Sample Webhook Payload" code={`{
  "txn_id": "SGP_7000000001_O33454322345235544469_1791180142",
  "order_id": "O33454322345235544469",
  "status": "SUCCESS",
  "amount": "100.00",
  "net_amount": "96.50",
  "charge_amount": "3.50",
  "utr": "616226595805",
  "pg_txn_id": "SC26100524529039",
  "payment_mode": "UPI",
  "timestamp": "2026-10-05 06:03:02"
}`} />

                <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl mt-6 flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-rose-500 flex-shrink-0" />
                  <p className="text-[14px] text-rose-800 font-bold leading-relaxed">
                    Always independently confirm the payment status server-side before crediting the customer — never trust webhook data alone.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 04 */}
          <section id="payout-direct" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">04</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">PayOut — Direct Payout</h2>
            </div>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl">
              Transfer funds to a beneficiary bank account via API. Payouts can also be initiated manually via Dashboard → Settle Fund.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
              <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider w-fit">POST</span>
              <code className="text-[15px] font-mono text-slate-800 font-semibold break-all">https://api.payflux.online/api/payout/client/direct-payout</code>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Request Parameters</h3>
            <Table
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['order_id', 'String', 'Required', 'Unique merchant-generated payout order ID'],
                ['amount', 'Float', 'Required', 'Payout amount in INR — e.g. 1000.00'],
                ['tpin', 'String', 'Required', 'Transaction PIN — 4 to 6 digits'],
                ['account_holder_name', 'String', 'Required', 'Beneficiary full name as per bank records'],
                ['account_number', 'String', 'Required', 'Beneficiary bank account number'],
                ['ifsc_code', 'String', 'Required', 'IFSC code of the beneficiary bank branch'],
                ['bank_name', 'String', 'Required', 'Name of the beneficiary bank'],
                ['payment_type', 'String', 'Required', 'Transfer mode: IMPS, NEFT, or RTGS'],
                ['purpose', 'String', 'Required', 'Payout narration — e.g. Vendor Payment'],
                ['bene_email', 'String', 'Required', 'Beneficiary email address for notification'],
                ['bene_mobile', 'String', 'Required', 'Beneficiary mobile number — 10 digits'],
                ['callback_url', 'String', 'Required', 'Your HTTPS endpoint to receive payout status callbacks']
              ]}
            />

            <CodeBlock id="s4-req" title="Sample Request Body" code={`{
  "order_id": "MERCHANT_ORDER_12345",
  "amount": 1000.00,
  "tpin": "1234",
  "account_holder_name": "John Doe",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "bank_name": "State Bank of India",
  "payment_type": "IMPS",
  "purpose": "Vendor Payment",
  "bene_email": "john@example.com",
  "bene_mobile": "9876543210",
  "callback_url": "https://yoursite.com/payout/callback"
}`} />

            <h3 className="text-xl font-bold text-slate-900 mt-10 mb-4">Response</h3>
            <CodeBlock id="s4-res" title="Response JSON" code={`{
  "amount_to_beneficiary": 100.0,
  "beneficiary": {
    "account_number": "0333252234535477550",
    "bank_name": "Slice Bank",
    "ifsc_code": "NESF0004433",
    "name": "Sujon majhi"
  },
  "charges": 0.0,
  "message": "Payout initiated successfully. Wallet has been deducted immediately.",
  "note": "Wallet has been deducted immediately. Will be refunded if payout fails.",
  "order_id": "TES342342533453454355640",
  "reference_id": "DP20260714023025160AF7",
  "requested_amount": 100.0,
  "status": "QUEUED",
  "success": true,
  "total_to_deduct": 100.0,
  "txn_id": "MO_TXN_5759C5FDB57A",
  "wallet_balance": 400.0
}`} />

            <Table
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['txn_id', 'String', 'Unique transaction ID assigned by Paysudo'],
                ['order_id', 'String', 'Your merchant payout order ID echoed back for confirmation'],
                ['reference_id', 'String', 'Internal reference ID generated by Paysudo'],
                ['status', 'String', 'Initial payout status — typically QUEUED'],
                ['beneficiary', 'Object', 'Beneficiary account details as submitted'],
                ['requested_amount', 'Float', 'Amount requested for payout'],
                ['total_to_deduct', 'Float', 'Total amount deducted from your wallet including charges'],
                ['wallet_balance', 'Float', 'Your remaining wallet balance after deduction']
              ]}
            />

            <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center gap-3">
                <FileJson className="text-indigo-500 w-6 h-6" />
                <h3 className="text-xl font-bold text-slate-900">
                  PayOut Webhook Callback
                </h3>
              </div>
              <div className="p-6 md:p-8">
                <p className="text-slate-600 leading-relaxed text-[15px] mb-6">
                  Once the payout is processed by the bank partner, Paysudo sends a real-time POST notification to the callback_url you supplied during payout creation.
                </p>

                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center gap-4 mb-8 max-w-fit">
                  <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider">POST</span>
                  <span className="text-[14px] font-semibold text-slate-800 font-mono">your callback_url</span>
                </div>

                <h4 className="font-bold text-slate-900 mb-4 text-lg">Webhook Fields</h4>
                <Table
                  headers={['Field', 'Type', 'Description']}
                  rows={[
                    ['txn_id', 'String', 'Unique transaction ID assigned by Paysudo'],
                    ['order_id', 'String', 'Your merchant payout order ID echoed back for confirmation'],
                    ['reference_id', 'String', 'Internal reference ID generated by Paysudo'],
                    ['amount', 'Number', 'Payout amount in INR'],
                    ['status', 'String', 'Final payout status: SUCCESS, PENDING, or FAILURE'],
                    ['utr', 'String', 'Unique Transaction Reference number from the bank'],
                    ['message', 'String', 'Human-readable status message']
                  ]}
                />

                <CodeBlock id="s4-webhook" title="Sample Webhook Payload" code={`{
  "txn_id": "MO_TXN_5759C5FDB57A",
  "order_id": "SGP_TXN_F813D5D8F87E", 
  "reference_id": "DP20260714023025160AF7",
  "amount": 100,
  "status": "SUCCESS",
  "utr": "619502471806",
  "message": "Payout Successful"
}`} />

                <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl mt-6 flex items-start gap-4">
                  <Zap className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <p className="text-[14px] text-amber-800 font-bold leading-relaxed">
                    Do not mark any payout as successful until the status is confirmed as SUCCESS — always cross-check with the Check Status API.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-12 mb-4">Payment Type Reference</h3>
            <Table
              headers={['Type', 'Full Name', 'Typical Limit', 'Settlement']}
              rows={[
                ['IMPS', 'Immediate Payment Service', 'Up to INR 5,00,000', 'Instant — 24x7'],
                ['NEFT', 'National Electronic Funds Transfer', 'No upper limit', 'Hourly batches'],
                ['RTGS', 'Real-Time Gross Settlement', 'INR 2,00,000+', 'Bank hours only']
              ]}
            />
          </section>

          {/* Section 05 */}
          <section id="payout-status" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">05</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">PayOut — Check Status by Order ID</h2>
            </div>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl">
              Check the payout transaction result using your own Client Order ID. This is a two-step process: first obtain a Bearer token, then query the status endpoint.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mb-4">Step 1 — Merchant Login</h3>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider w-fit">POST</span>
              <code className="text-[15px] font-mono text-slate-800 font-semibold break-all">https://api.payflux.online/api/merchant/login</code>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-10 mb-4">Step 2 — Status Check Endpoint</h3>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-md tracking-wider w-fit">GET</span>
              <code className="text-[15px] font-mono text-slate-800 font-semibold break-all">https://api.payflux.online/api/payout/client/check-status-by-order-id/{"{ORDER_ID}"}</code>
            </div>

            <Table
              headers={['URL Parameter', 'Type', 'Required', 'Description']}
              rows={[
                ['ORDER_ID', 'String', 'Required', 'The Client Order ID you provided when initiating the payout']
              ]}
            />

            <CodeBlock id="s6-req" title="Sample Request" code={`GET https://api.payflux.online/api/payout/client/check-status-by-order-id/ORDER12345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json`} />

            <CodeBlock id="s6-res" title="Sample Response" code={`{
  "data": {
    "amount": 2015.0,
    "completed_at": "2026-04-02 21:57:23",
    "created_at": "2026-04-02 21:52:03",
    "order_id": "ORDER12345",
    "pg_partner": "Pg",
    "reference_id": "DP2026040221520368FF8E",
    "status": "SUCCESS",
    "txn_id": "TXN5074C9A5A1B5",
    "utr": "609221495505"
  },
  "message": "Payout status retrieved successfully",
  "success": true
}`} />

            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl mt-10">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">Recommended Integration Flow</h3>
              <ol className="space-y-3 text-[14px] text-indigo-800 list-decimal pl-5 font-medium">
                <li>Call <code className="bg-white/60 px-1 rounded">POST /api/merchant/login</code> with merchantId and password.</li>
                <li>Extract the token from the login response.</li>
                <li>Call <code className="bg-white/60 px-1 rounded">GET check-status-by-order-id/{"{ORDER_ID}"}</code> with the Bearer token.</li>
                <li><strong className="text-emerald-700">SUCCESS</strong> → Mark the payout as complete in your system.</li>
                <li><strong className="text-amber-700">PENDING</strong> → Wait briefly, then poll again.</li>
                <li><strong className="text-rose-700">FAILURE</strong> → Log the details and alert your operations team.</li>
              </ol>
            </div>
          </section>

          {/* Section 06 */}
          <section id="ip-whitelist" className="pb-16 border-b border-slate-100 mb-16 scroll-mt-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl border border-indigo-100">06</div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">IP Whitelisting</h2>
            </div>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl">
              For security, Paysudo restricts API access to whitelisted IP addresses only. Share your server's outbound IP address(es) with the Paysudo team before your API calls will be accepted.
            </p>

            <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl flex items-start gap-4 mb-10">
              <ShieldCheck className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <p className="text-[14px] text-rose-800 font-bold leading-relaxed">
                All API requests from non-whitelisted IPs will be rejected. Whitelist all server IPs including staging and production environments.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6">How to Get Whitelisted</h3>

              <ol className="space-y-8 text-[15px] text-slate-700 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                <li className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold text-sm">1</div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <span className="block mb-2 font-bold text-slate-900">Identify your server's outbound IP</span>
                    <p className="text-sm text-slate-600 mb-3">Run on your server terminal:</p>
                    <code className="bg-slate-800 text-emerald-400 px-3 py-1.5 rounded block text-sm shadow-sm font-mono">curl https://api.ipify.org</code>
                  </div>
                </li>

                <li className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold text-sm">2</div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <span className="block mb-2 font-bold text-slate-900">Share IP with Paysudo team</span>
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><span className="text-slate-500 font-semibold w-16 inline-block">Email:</span> <a href="mailto:support@paysudo.tech" className="text-indigo-600 font-bold hover:underline">support@paysudo.tech</a></p>
                      <p><span className="text-slate-500 font-semibold w-16 inline-block">Subject:</span> IP Whitelisting Request</p>
                    </div>
                  </div>
                </li>

                <li className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold text-sm">3</div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900">Wait for confirmation</span>
                    <p className="text-sm text-slate-600 mt-1">Wait for confirmation that your IPs have been whitelisted.</p>
                  </div>
                </li>

                <li className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold text-sm">4</div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900">Test Integration</span>
                    <p className="text-sm text-slate-600 mt-1">Only then test your API integration.</p>
                  </div>
                </li>
              </ol>

              <div className="mt-10 pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3 text-[15px]">Important Notes</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 marker:text-slate-400">
                  <li>If you use multiple servers or load balancers, provide all outbound IP addresses.</li>
                  <li>If your IP changes (e.g. after server migration), contact the Paysudo team immediately.</li>
                  <li>Static IP addresses are strongly recommended for production environments.</li>
                </ul>
              </div>
            </div>
          </section>

          <footer className="pt-8 pb-12 flex flex-col items-center justify-center border-t border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Code className="h-5 w-5" />
              <span className="font-black tracking-tight text-slate-500">PAYSUDO</span>
            </div>
            <p className="font-medium text-slate-400 text-sm">api.payflux.online · Confidential v1.1 · July 2026</p>
            <p className="text-xs text-slate-400 mt-2">© 2026 Paysudo Payment Gateway. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

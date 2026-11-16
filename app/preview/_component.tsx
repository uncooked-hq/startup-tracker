'use client';
import { useEffect, useState, type MouseEvent } from "react";
const partnerLogos = {
  eloLogo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412373301277646848/e19e76c16fbe5f492895096da80d49e0d6eed937b0dec75fc069c7b5e51ad83b.svg",
  clearzoneLogo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412373301277646848/f449fc89361f0e42fb8f1389843f453a3c867680e86455a5b89d375edf567c5d.avif",
  benchLogo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412377301892866048/f6edb870a1fc2d492b5f5e88b8102bc2b6339b98acb877d003be8d453ab2cd33.svg"
};
const networkingStickerIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/138bc9f7885801a2ddf39bfa591b6e1199df916fabaaab0e10e51d1d08095102.png";
const networkingPenIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/8d40a1b70e5edc97c91605cc59196a329cdaccfe083746cb7171300e954daec1.png";
const networkingGuideIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/6dc556b1204ca00ee7d456fe83d7282ad8cf4de2f7b1cb7b44ac013c43358c13.png";
const networkingCrossIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/abe9bb7df4cf8884375fdb02712632121a029c8a10efb914ebfc765b85d4bb3f.png";
const networkingOpportunityIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/7e055e8d73d69c21cfe636356317e85f4ac902693b89ff61fc906bf1d699d920.png";
const networkingFounderIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/767c6f848cce3f10c03c9e1984adc50c8a2c2e47668d1224a0b66fd027e561d7.png";
const networkingIdeasIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/60b30625fa4a5064565927ce46d7e8748188f08b256a43f15a13e6dcda7679e9.png";
const interestRoboticsIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/3a9079ec2e5a13f63f804e8a8bde2a10ac87de74e0d5569765ab044ef63f39d2.png";
const interestAerospaceIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/7bc8f3018e432f6ad637bee7d6b361eaae182a319209046e1899c1fc364df5f1.png";
const interestEngineeringIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/167cad85b7ec158588a537c2cb5aaad36591923be12529067c85e6ebcc8fad3e.png";
const interestOtherIcon = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411993359532580864/dca5b94059da43e1b00916eed785d7500a04b00a5393bffef547bd6b0fe49570.png";
const clearzoneDeviceImage = "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412629514569531392/e7c9da601fcfcdbc0964cbf9fc08eb3fe7f39ac345f600bd5e99bf91c0e70560.jpg";
const assets = {
  hero: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411542694968569856/411542694968569857/f6bf520d9ea9afbcd3d0273aaffbd3ab56cf125e949cc86325c21319523e04c4.png",
  hassan: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412377301892866048/8a00e047ea9553b7648d5a8bf65e73e5b26d7633b98a6c915976866536a75364.jpg",
  joe: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412377301892866048/e23484639981a30b53efd11d375fc9cd95cde1262cf2316a394050b31aaf5da9.jpg",
  haider: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412377301892866048/f96571d2b0cef32a8712cdf7013c3b40fffa879be71213eab03f14ac0806c4cf.jpg",
  elo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411542694968569856/411542694968569857/7e447b8b97f510348f590c2be55af3533d678126e682b096dbe9f0d9423c6684.png",
  clearzone: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411542694968569856/411542694968569857/f05b3f27d07963d556910403b5875bc77c3c9a951bc9b5f2bd9d11f5c79e81b0.png",
  mtfLogo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411606940842602496/4cca9ca66169caaa33e00ced5e0cbb5d8fc2071fba8c29e100208e9c38f5666f.png",
  iconLogo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411559210107686912/bd657fd481d242cb9ea200f2b6acb8b41ee233abe2af85ff9758058853815010.png",
  iconDemo: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411559210107686912/6edd93ec11ad831a2f8a2d12c11fc9dcd0801d64ff4ae06b0e885b3218495bee.png",
  iconVenue: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411559210107686912/ae7ca82fec9e9cf25388351929e36e0c18896846685b6de28435477d8b7e5f86.png",
  iconFounders: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411568659874594816/cbc9f522c05d5245d3fbbc2a28749daf4dac6f47d14705e4c8ceb87b77b994ff.png",
  iconCommunity: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411559210107686912/6d56d47a8cd30f2742df29c9c1cedd50c60bc2cc734de4dba9baf29e80b51571.png",
  iconRsvp: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/411555566704537600/411568659874594816/451729bd82d165dd27e5f2e18cbfd00e6730f1f5492d3d06b8789eeae4faaab5.png",
  raihaan: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412377301892866048/9ec9eb205d3f195939e4c405bf247d7496dd6b9cabee9b842ab66d7319ef1dda.jpg"
};
const EVENT_START_ISO = "2026-06-06T10:30:00+01:00";
const logistics = [{
  label: "TIME",
  value: "10:30 AM – 11:30 AM",
  icon: assets.iconDemo,
  alt: "3D hardware demo icon"
}, {
  label: "ROOM",
  value: "Believers Room, Champagne Suite, 2nd",
  icon: assets.iconVenue,
  alt: "3D venue location icon"
}, {
  label: "CAPACITY",
  value: "50–60 founders and builders",
  icon: assets.iconCommunity,
  alt: "3D community network icon"
}];
const founders = [{
  name: "Hassan Shahzad",
  role: "CEO",
  company: "Elo",
  university: "UCL",
  accent: "green",
  portrait: assets.hassan,
  portraitPosition: "50% 48%",
  product: assets.elo,
  productAlt: "Generated product image of a wheeled humanoid robot prototype",
  body: ["Hassan has been building robots since he was 12. Now he's building Elo, a London based robotics startup aiming to make the UK's flagship autonomous humanoid by mid 2027.", "Their first product, Elo Lite, is an affordable open source wheeled humanoid used to collect robot training data and deploy autonomous models. He'll have Elo Lite on the table. Come see it."]
}, {
  name: "Joe Clinton",
  role: "CTO",
  company: "Elo",
  university: "UCL",
  accent: "purple",
  portrait: assets.joe,
  portraitPosition: "50% 50%",
  product: assets.elo,
  productAlt: "Generated product image of Elo Lite robot hardware",
  body: ["Joe is a PhD candidate at UCL developing more efficient ways to train foundational robotics models for dexterous manipulation tasks.", "He leads the technical vision behind Elo's humanoid programme. His bet: robotics is about to accelerate enormously, and he wants to make that future accessible to everyone."]
}, {
  name: "Haider Ali",
  role: "CEO",
  company: "ClearZone",
  university: "KCL",
  accent: "orange",
  portrait: assets.haider,
  portraitPosition: "50% 18%",
  product: assets.clearzone,
  productAlt: "Generated product image of a minimalist phone-blocking zone device",
  body: ["Haider built ClearZone to help people take their time back: a physical device that creates a zone where your phone stops working.", "He started his first company at 15, scaled to £10K MRR by 16, and has worked on projects with Qualcomm and Unity seen by billions."]
}, {
  name: "Raihaan Usman",
  role: "Co-founder & CTO",
  company: "Bench",
  university: "Imperial College London",
  accent: "pink",
  portrait: assets.raihaan,
  portraitPosition: "50% 48%",
  product: assets.hero,
  productAlt: "Generated editorial image of builders gathered around a robotics demo table",
  body: ["Raihaan is building Bench, an AI engineering framework for designing high performance hardware, and the infrastructure to make it happen. Bench is backed by EWOR.", "He has spent close to a decade in AI, working on optimal control, reinforcement learning, and optimisation, before turning those methods on engineering design itself. Before Bench, he was deep in aerospace, leading vehicle teams at the Karman Space Programme and working as a software engineer at the European Space Agency, after studying Aerospace Engineering at Imperial.", "His work now sits where AI meets hardware engineering, building the tools that help engineering teams actually ship."]
}];
const demoGallery = [{
  label: "ELO FACE",
  title: "Expressive Face",
  description: "A NeoPixel LED face that reacts to live voice input with real-time micro-expressions.",
  image: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412600529433268224/ee81bfb73e0815a969a783ead8a2f17ded76752611bab751c23db3e756bf887d.jpg",
  alt: "Elo expressive face: a custom PCB matrix of NeoPixel LEDs generates real-time micro-expressions from live voice input, shifting when listening and glowing when happy.",
  accent: "green",
  position: "50% 44%"
}, {
  label: "ELO BASE",
  title: "Omnidirectional Base",
  description: "A hoverboard-motor omni base that moves cleanly in any direction without awkward turning.",
  image: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412600529433268224/1c3fae36bf814c89b6ab6bbd848154832ea4cbe9a3fca028e72da6af75fcfc40.jpg",
  alt: "Elo omnidirectional base built from upcycled hoverboard motors with custom omnidirectional wheels, moving in any direction without awkward turning.",
  accent: "purple",
  position: "50% 50%"
}, {
  label: "GEM ARM",
  title: "7 DOF GEM Arm",
  description: "A stronger 7 DOF arm with higher payload, more reach, and a parallel gripper for useful tasks.",
  image: "https://storage.googleapis.com/storage.magicpath.ai/component-assets/412000188958404608/412600529433268224/e4ca7eff720c16e3b9efdfb4f1dfa7fb2e8f1edbed8c961c095e9f914d7d79d4.jpg",
  alt: "Elo 7 DOF GEM Arm on a live demo table, redesigned with higher payload, two extra degrees of freedom, a parallel gripper, and longer reach.",
  accent: "orange",
  position: "50% 52%"
}, {
  label: "CLEARZONE DEVICE",
  title: "Physical focus zone device",
  description: "The actual ClearZone unit: a compact hardware box that helps create a phone-free zone.",
  image: clearzoneDeviceImage,
  alt: "Real photo of the black ClearZone hardware device, upright and framed to fill the card.",
  accent: "pink",
  position: "50% 50%"
}];
const networkingColours = [{
  colour: "BLUE",
  meaning: "Working in the space, or happy to mentor",
  accent: "blue",
  hex: "#2f7cff"
}, {
  colour: "YELLOW",
  meaning: "Curious and here to learn",
  accent: "yellow",
  hex: "#f4d84f"
}, {
  colour: "GREEN",
  meaning: "Looking to work in the space",
  accent: "green",
  hex: "#00E18E"
}, {
  colour: "PINK",
  meaning: "Founder, building something of your own",
  accent: "pink",
  hex: "#FF7CE8"
}];
const networkingMatches = [{
  title: "Guide Match",
  pairing: "Blue meets Yellow",
  body: "People who are curious meet people already doing the work.",
  accent: "blue-yellow",
  icon: networkingGuideIcon,
  iconAlt: "3D blue and yellow guide match icon",
  colours: ["#2f7cff", "#f4d84f"]
}, {
  title: "Cross-Space Match",
  pairing: "Any space meets any space",
  body: "Unexpected links across AI, robotics, aerospace, and engineering.",
  accent: "cross",
  icon: networkingCrossIcon,
  iconAlt: "3D cross-space network icon",
  colours: ["#6849F9", "#E98D26"]
}, {
  title: "Opportunity Match",
  pairing: "Green meets Blue",
  body: "People looking to get in meet the ones who can open the door.",
  accent: "green-blue",
  icon: networkingOpportunityIcon,
  iconAlt: "3D green and blue opportunity match icon",
  colours: ["#00E18E", "#2f7cff"]
}, {
  title: "Founder Match",
  pairing: "Pink meets anyone",
  body: "Founders find co-founders, early teammates, and talent.",
  accent: "pink-any",
  icon: networkingFounderIcon,
  iconAlt: "3D pink founder match icon",
  colours: ["#FF7CE8", "#00E18E"]
}];
const networkingClose = ["You leave with real connections.", "The kind that lead somewhere.", "Your next opportunity.", "A co-founder.", "A new direction.", "Maybe just someone who gets what you're working on."];
const interestTags = [{
  label: "Robotics",
  icon: interestRoboticsIcon,
  alt: "3D robotics interest icon"
}, {
  label: "Aerospace",
  icon: interestAerospaceIcon,
  alt: "3D aerospace interest icon"
}, {
  label: "Engineering",
  icon: interestEngineeringIcon,
  alt: "3D engineering interest icon"
}, {
  label: "Other",
  icon: interestOtherIcon,
  alt: "3D other interest icon"
}];
const venueLocations = [{
  label: "The Session",
  location: "Believers Room, Champagne Suite, 2nd Floor",
  timing: "10:30 AM to 11:30 AM"
}, {
  label: "The Booth",
  location: "Booth E3, Experience Exhibitor Zone, Ground Floor",
  timing: "Part of the Expo, all day"
}];
const venueAddress = ["Muslim Tech Fest 2026", "Novotel London West, Hammersmith", "1 Shortlands, London W6 8DR"];
const boothCopy = {
  eyebrow: "AT THE BOOTH",
  headline: "Meet us after the session.",
  body: ["The session is your chance to connect with these founders and others building in the space.", "After that, you'll find us at Booth E3 all day. Get up close with the robots, speak with the founders behind Elo and ClearZone one to one, and hear what they're building.", "You can also join the Uncooked Labs community right there at the booth."],
  location: "Booth E3, Experience Exhibitor Zone, Ground Floor"
};
const getCountdownParts = () => {
  const difference = Math.max(0, new Date(EVENT_START_ISO).getTime() - Date.now());
  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return [{
    label: "days",
    value: days
  }, {
    label: "hours",
    value: hours
  }, {
    label: "mins",
    value: minutes
  }, {
    label: "secs",
    value: seconds
  }];
};
export const AtomsAmbitionLandingPageWithImages = () => {
  const [countdown, setCountdown] = useState(getCountdownParts);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdownParts()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const footer = document.querySelector(".aa-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsFooterVisible(entry.isIntersecting);
    }, {
      threshold: 0.12
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);
  const closeMenu = () => setIsMenuOpen(false);
  const scrollToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const start = window.scrollY || document.documentElement.scrollTop;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || start < 2) {
      window.scrollTo(0, 0);
      window.history.replaceState(null, "", "#top");
      return;
    }
    const duration = Math.min(1100, Math.max(560, start * 0.42));
    const startedAt = window.performance.now();
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
    const frame = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      window.scrollTo(0, Math.round(start * (1 - easeOutCubic(progress))));
      if (progress < 1) {
        window.requestAnimationFrame(frame);
        return;
      }
      window.history.replaceState(null, "", "#top");
    };
    window.requestAnimationFrame(frame);
  };
  return <main className="aa-page">
      <nav className={`aa-site-nav ${isMenuOpen ? "aa-nav-open" : ""}`} aria-label="Uncooked Labs event route">
        <a className="aa-mark" href="#top" aria-label="Uncooked Labs home" onClick={closeMenu}>
          <img src={assets.iconLogo} alt="" aria-hidden="true" />
          <span>Uncooked</span><strong>Labs</strong>
        </a>
        <button className="aa-menu-toggle" type="button" aria-label="Toggle navigation menu" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(open => !open)}>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <div className="aa-tabs" aria-label="Site sections">
          <a href="#venue" onClick={closeMenu}>Venue</a>
          <a href="#see" onClick={closeMenu}>What you'll see</a>
          <a href="#networking" onClick={closeMenu}>Networking</a>
          <a href="#founders" onClick={closeMenu}>Founders</a>
          <a href="#join" onClick={closeMenu}>Join</a>
          <a className="aa-mobile-back-link" href="https://uncookedjobs.com" onClick={closeMenu}>Back to the main Uncooked site <span className="aa-nav-arrow" aria-hidden="true"></span></a>
        </div>
        <a className="aa-back-link" href="https://uncookedjobs.com" aria-label="Back to the Uncooked Jobs website">
          <span className="aa-back-full">Back to Uncooked website</span>
          <span className="aa-back-short">Back</span>
          <span className="aa-nav-arrow aa-nav-arrow-back" aria-hidden="true"></span>
        </a>
      </nav>
      <a className={`aa-back-top ${isFooterVisible ? "aa-back-top-footer" : ""}`} href="#top" aria-label="Back to top" onClick={scrollToTop}>
        <span aria-hidden="true">↑</span>
      </a>

      <section className="aa-hero" id="top">
        <div className="aa-hero-copy">
          <img className="aa-mtf-logo" src={assets.mtfLogo} alt="Muslim Tech Fest" />
          <p className="aa-eyebrow">MUSLIM TECH FEST · LONDON 2026 · HARDWARE</p>
          <h1>
            <span>Hard Tech</span>
            <span className="aa-hero-accent">Enthusiasts</span>
          </h1>
          <p className="aa-hero-text">
            Live demos. Real founders. This is a session for anyone curious about hardware, robotics, and deep tech. Watch founders demo what they've built. Connect with the community behind it. Get inspired to start building yourself, or find a team that needs you. Come meet people building the future.
          </p>
          <div className="aa-hero-icons" aria-label="Session themes">
            <span><img src={assets.iconDemo} alt="" aria-hidden="true" /> Hardware demos</span>
            <span><img src={assets.iconFounders} alt="" aria-hidden="true" /> Founder room</span>
            <span><img src={assets.iconCommunity} alt="" aria-hidden="true" /> Builder community</span>
          </div>
          <div className="aa-cta-row" aria-label="Event actions">
            <a className="aa-button aa-button-primary" href="[RSVP_LINK_PLACEHOLDER]">
              <img className="aa-button-icon" src={assets.iconRsvp} alt="" aria-hidden="true" />
              <span className="aa-button-label">RSVP to the Session</span>
              <span className="aa-button-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <aside className="aa-hero-image-card" aria-label="Live hardware demo image">
          <img src={assets.hero} alt="Generated editorial image of builders gathered around a robotics demo table" />
          
          <div className="aa-live-strip">
            <span>LIVE DEMO TABLE</span>
            <strong>10:30</strong>
          </div>
        </aside>
      </section>

      <section className="aa-info-row" aria-label="Session information">
        {logistics.map(item => <div key={item.label}>
            <img className="aa-info-icon" src={item.icon} alt={item.alt} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>)}
      </section>

      <section className="aa-section aa-venue" id="venue">
        <div className="aa-section-intro">
          <img className="aa-section-icon" src={assets.iconVenue} alt="3D venue location icon" style={{
          display: "none"
        }} />
          <div>
            <p className="aa-label">VENUE</p>
            <h2>Where to find us</h2>
          </div>
        </div>
        <div className="aa-venue-layout">
          <div className="aa-venue-locations">
            {venueLocations.map(item => <article className="aa-venue-location" key={item.label}>
                <p className="aa-venue-kicker">{item.label}</p>
                <h3>{item.location}</h3>
                <p className="aa-venue-time">{item.timing}</p>
              </article>)}
          </div>
          <div className="aa-venue-address" aria-label="Venue address">
            {venueAddress.map(line => <p key={line}>{line}</p>)}
          </div>
        </div>
      </section>

      <section className="aa-hosted">
        <div className="aa-hosted-copy">
          <p className="aa-label aa-label-lime">HOSTED BY</p>
          <h2>Uncooked <span>Labs</span></h2>
        </div>
        <div className="aa-partner-lockup" aria-label="In partnership with Elo, ClearZone and Bench">
          <p>In partnership with</p>
          <div className="aa-partner-logos" aria-label="Partner logos">
            <span className="aa-partner-logo aa-partner-elo" role="img" tabIndex={0} aria-label="Elo partner logo" data-partner-name="Elo">
              <img src={partnerLogos.eloLogo} alt="" aria-hidden="true" />
            </span>
            <span className="aa-partner-logo aa-partner-clearzone" role="img" tabIndex={0} aria-label="ClearZone partner logo" data-partner-name="ClearZone">
              <img src={partnerLogos.clearzoneLogo} alt="" aria-hidden="true" />
            </span>
            <span className="aa-partner-logo aa-partner-bench" role="img" tabIndex={0} aria-label="Bench partner logo" data-partner-name="Bench">
              <img src={partnerLogos.benchLogo} alt="" aria-hidden="true" />
            </span>
          </div>
        </div>
      </section>

      <section className="aa-section aa-founders" id="founders">
        <div className="aa-section-intro aa-founders-intro">
          <img className="aa-section-icon" src={assets.iconDemo} alt="3D hardware demo icon" style={{
          display: "none"
        }} />
          <div>
            <h2>Headliner founders</h2>
            <p className="aa-founders-subtitle">The people you'll meet.</p>
            <p className="aa-founders-note" style={{
            display: "none"
          }}>Some of them will have what they've built on the table. Come see it up close.</p>
          </div>
        </div>

        <div className="aa-founder-list">
          {founders.map(founder => <article className={`aa-founder-card aa-founder-${founder.accent}`} key={founder.name}>
              <div className="aa-founder-media">
                <figure className="aa-photo-frame">
                  <img src={founder.portrait} alt={`Portrait of ${founder.name}`} style={{
                objectPosition: founder.portraitPosition
              }} />
                
                </figure>
              </div>

              <div className="aa-founder-copy">
                <h3>{founder.name}</h3>
                <div className="aa-founder-meta" aria-label={`${founder.name} role and organisation`}>
                  <span>{founder.role}</span>
                  <strong>{founder.company}</strong>
                  <em>{founder.university}</em>
                </div>
                {founder.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>)}
        </div>

        <section className="aa-demo-gallery" id="see" aria-label="What you will see in person">
          <div className="aa-demo-gallery-copy">
            <p className="aa-label">YOU'LL SEE IN THE ROOM</p>
            <h3>Demos and Q&amp;A.</h3>
          </div>
          <div className="aa-demo-marquee">
            <div className="aa-demo-track">
              {[...demoGallery, ...demoGallery].map((item, index) => <figure className={`aa-demo-card aa-demo-${item.accent}`} key={`${item.label}-${index}`} aria-hidden={index >= demoGallery.length}>
                  <img src={item.image} alt={index < demoGallery.length ? item.alt : ""} style={{
                objectPosition: item.position ?? "50% 50%"
              }} />
                  <figcaption>
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </figcaption>
                </figure>)}
            </div>
          </div>
        </section>
      </section>

      <section className="aa-section aa-networking" id="networking">
        <div className="aa-networking-opener">
          <div>
            <p className="aa-label">NETWORKING</p>
            <h2>Connection by design</h2>
          </div>
          <div className="aa-networking-body">
            <h3>How we connect you to the right people</h3>
            <p>We designed this whole session around one thing: helping you meet the people worth meeting.</p>
            <p>Most events leave that to chance. You show up, you hope, you hover near the snacks. We wanted something better.</p>
          </div>
        </div>

        <div className="aa-networking-flow">
          <section className="aa-sticker-builder" aria-labelledby="networking-sticker-heading">
            <div className="aa-sticker-copy">
              <img className="aa-networking-art aa-networking-art-sticker" src={networkingStickerIcon} alt="3D sticker icon" />
              <div>
                <p className="aa-step-label">Before entering</p>
                <h3 id="networking-sticker-heading">Pick up a sticker</h3>
                <p>So when you walk in, you grab a sticker and write what you're into. Your colour shows what you're here for.<br className="aa-desktop-copy-break" /> Everyone can read the room in a glance. No awkward openers. No guessing who to talk to. You just walk up to the right people.</p>
              </div>
            </div>

            <div className="aa-sticker-write">
              <div className="aa-write-card">
                <img src={networkingPenIcon} alt="3D pen icon" />
                <div>
                  <span>On your sticker, write</span>
                  <strong>I'm interested in...</strong>
                </div>
              </div>
              <div className="aa-interest-grid" aria-label="Example sticker interests">
                {interestTags.map(tag => <span className="aa-interest-chip" key={tag.label}>
                    <img src={tag.icon} alt={tag.alt} />
                    {tag.label}
                  </span>)}
              </div>
            </div>
          </section>

          <section className="aa-colours-panel" aria-labelledby="networking-colours-heading">
            <div className="aa-networking-block-heading">
              <p className="aa-step-label">Colour key</p>
              <h3 id="networking-colours-heading">The colours</h3>
            </div>
            <div className="aa-colour-grid">
              {networkingColours.map(item => <article className={`aa-colour-card aa-colour-${item.accent}`} key={item.colour}>
                  <span className="aa-colour-dot" aria-hidden="true"></span>
                  <div>
                    <strong>{item.colour}</strong>
                    <p>{item.meaning}</p>
                  </div>
                </article>)}
            </div>
          </section>
        </div>

        <section className="aa-networking-block aa-networking-matches" aria-labelledby="networking-matches-heading">
          <div className="aa-networking-block-heading">
            <p className="aa-step-label">Connection types</p>
            <h3 id="networking-matches-heading">Four ways the room connects</h3>
            <p>We made it easy for the right people to find each other.</p>
          </div>
          <div className="aa-match-grid">
            {networkingMatches.map(match => <article className={`aa-match-card aa-match-${match.accent}`} key={match.title}>
                <div className="aa-match-icon-wrap">
                  <img src={match.icon} alt={match.iconAlt} />
                </div>
                <div className="aa-match-card-copy">
                  <div className="aa-match-colours" aria-hidden="true">
                    <span></span>
                    <span></span>
                  </div>
                  <h4>{match.title}</h4>
                  <strong>{match.pairing}</strong>
                  <p>{match.body}</p>
                </div>
              </article>)}
          </div>
        </section>

        <div className="aa-networking-block aa-ideas-wall">
          <img className="aa-ideas-icon" src={networkingIdeasIcon} alt="3D ideas wall icon" />
          <div>
            <p className="aa-step-label">Room prompt</p>
            <h3>The ideas wall</h3>
            <p>There's a wall in the room. Write down something you're building, thinking about, or stuck on. Then go find the person who wrote the one next to yours.</p>
            <p>Some of the best conversations start with a sentence on a wall, not a handshake.</p>
          </div>
        </div>

        <div className="aa-networking-close" aria-label="Meet, connect, build">
          <div className="aa-close-lines">
            <article>
              <strong>{networkingClose[0]}</strong>
              <span>{networkingClose[3]}</span>
            </article>
            <article>
              <strong>{networkingClose[1]}</strong>
              <span>{networkingClose[4]}</span>
            </article>
            <article>
              <strong>{networkingClose[2]}</strong>
              <span>{networkingClose[5]}</span>
            </article>
          </div>
          <div className="aa-close-path">
            <span>Meet</span>
            <span className="aa-close-arrow" aria-hidden="true"></span>
            <span>Connect</span>
            <span className="aa-close-arrow" aria-hidden="true"></span>
            <span>Build</span>
          </div>
        </div>
      </section>

      <section className="aa-section aa-booth" id="booth" aria-labelledby="booth-heading">
        <div className="aa-booth-card">
          <div className="aa-booth-copy">
            <p className="aa-label aa-label-purple">{boothCopy.eyebrow}</p>
            <h2 id="booth-heading">{boothCopy.headline}</h2>
            <div className="aa-booth-body">
              {boothCopy.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
          <div className="aa-booth-location" aria-label="Booth location">
            <span>Find us</span>
            <strong>{boothCopy.location}</strong>
          </div>
        </div>
      </section>

      <section className="aa-countdown-section" aria-label="Countdown to Atoms and Ambition">
        <div className="aa-countdown-copy">
          <h2>Doors open soon.</h2>
        </div>
        <div className="aa-countdown">
          <div>
            <p>Session starts</p>
            <strong>6 June · 10:30 · Believers Room · Champagne Suite, 2nd</strong>
          </div>
          <dl>
            {countdown.map(part => <div key={part.label}>
                <dt>{part.label}</dt>
                <dd>{String(part.value).padStart(2, "0")}</dd>
              </div>)}
          </dl>
        </div>
      </section>

      <section className="aa-after" id="join">
        <div className="aa-after-inner">
          <img className="aa-after-icon" src={assets.iconCommunity} alt="3D builder community icon" />
          <div>
            <p className="aa-label">AFTER THE SESSION</p>
            <h2>Stay connected.</h2>
          </div>
          <p>
            Uncooked Labs is the UK's builder community for startup careers in hardware, robotics, deep tech, and everything in between. Join to hear about future sessions, meetups, and opportunities.
          </p>
          <a className="aa-button aa-button-primary" href="[TALLY_LINK_PLACEHOLDER]">
            <span className="aa-button-label">Join Uncooked Labs</span>
            <span className="aa-button-arrow" aria-hidden="true">→</span>
          </a>
          <small>
            Hosted by Uncooked Labs at Muslim Tech Fest 2026. This is an interactive demo and networking session, not a panel.
          </small>
        </div>
      </section>

      <footer className="aa-footer">
        <div className="aa-footer-watermark" aria-hidden="true">
          <span>Uncooked</span>
        </div>
        <div className="aa-footer-brand">
          <div className="aa-footer-wordmark" aria-label="Uncooked Labs">
            <span>Uncooked</span><strong>Labs</strong>
          </div>
          <p>Uncooked Labs is the community arm of Uncooked Jobs.</p>
          <small>All rights reserved 2006 Uncooked.</small>
        </div>
        <nav aria-label="Uncooked Labs social links">
          <a href="https://www.instagram.com/uncookedjobs/" aria-label="Uncooked Jobs on Instagram">Instagram</a>
          <a href="https://www.linkedin.com/company/uncookedjobs/?viewAsMember=true" aria-label="Uncooked Jobs on LinkedIn">LinkedIn</a>
          <a href="https://uncookedjobs.com" aria-label="Uncooked Jobs main website">Uncooked Jobs website</a>
        </nav>
      </footer>
    </main>;
};

import Navbar from "./landing/components/Navbar";
import Hero from "./landing/components/Hero";
import StatsBar from "./landing/components/StatsBar";
import ProblemSection from "./landing/components/ProblemSection";
import HowItWorks from "./landing/components/HowItWorks";
import Features from "./landing/components/Features";
import Testimonials from "./landing/components/Testimonials";
import CtaSection from "./landing/components/CtaSection";
import Footer from "./landing/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <ProblemSection />
        <HowItWorks />
        <Features />
        <Testimonials />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}

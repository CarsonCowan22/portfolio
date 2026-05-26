import Contact from '@/components/Contact/Contact';
import Experience from '@/components/Experience/Experience';
import Footer from '@/components/Footer/Footer';
import Hero from '@/components/Hero/Hero';
import Nav from '@/components/Nav/Nav';
import Work from '@/components/Work/Work';

export default function Page() {
  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <Work />
        <Experience />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
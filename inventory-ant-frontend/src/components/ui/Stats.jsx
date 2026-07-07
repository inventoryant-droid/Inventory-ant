import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

function CountUp({
  to,
  suffix = '',
  prefix = '',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}
      {Math.round(value).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 12000, suffix: '+', label: 'Businesses onboarded' },
  { value: 3.5, suffix: 'Cr+', prefix: '₹', label: 'Billed every month', decimal: true },
  { value: 28, suffix: '', label: 'States & UTs covered' },
  { value: 99.9, suffix: '%', label: 'Uptime guarantee', decimal: true },
];

export function Stats() {
  return (
    <section className="bg-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl m-0">
              {stat.decimal ? (
                <>
                  {stat.prefix}
                  {stat.value}
                  {stat.suffix}
                </>
              ) : (
                <CountUp to={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              )}
            </p>
            <p className="mt-2 mb-0 text-sm text-emerald-100/90">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

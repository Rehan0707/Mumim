"use client"

import * as React from "react"

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export interface MagicTextProps {
  text: string;
  className?: string;
  wordClassName?: string;
}

interface WordProps {
  children: string;
  progress: any;
  range: number[];
  className?: string;
}

const Word: React.FC<WordProps> = ({ children, progress, range, className }) => {
  const opacity = useTransform(progress, range, [0, 1]);

  return (
    <span className={`relative mr-1 ${className || "mt-[12px] text-3xl font-semibold"}`}>
      <span className="absolute opacity-20">{children}</span>
      <motion.span style={{ opacity: opacity }}>{children}</motion.span>
    </span>
  );
};

export const MagicText: React.FC<MagicTextProps> = ({ text, className, wordClassName }) => {
  const container = useRef(null);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.9", "start 0.25"],
  });

  const words = text.split(" ");

  return (
    <p ref={container} className={`flex flex-wrap p-4 ${className || "leading-[0.5]"}`}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;

        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]} className={wordClassName}>
            {word}
          </Word>
        );
      })}
    </p>
  );
};

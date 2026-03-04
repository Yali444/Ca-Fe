import React, { useRef, useEffect, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';



interface ScrollItem {

  id: number;

  title: string;

  description: string;

  year: string;

}



const defaultItems: ScrollItem[] = [

  {

    id: 1,

    title: 'Project Alpha',

    description: 'A revolutionary approach to modern web development',

    year: '2024',

  },

  {

    id: 2,

    title: 'Project Beta',

    description: 'Innovative solutions for complex problems',

    year: '2024',

  },

  {

    id: 3,

    title: 'Project Gamma',

    description: 'Pushing the boundaries of user experience',

    year: '2023',

  },

  {

    id: 4,

    title: 'Project Delta',

    description: 'Seamless integration across platforms',

    year: '2023',

  },

  {

    id: 5,

    title: 'Project Epsilon',

    description: 'Next-generation design systems',

    year: '2023',

  },

  {

    id: 6,

    title: 'Project Zeta',

    description: 'Building the future of digital experiences',

    year: '2022',

  },

  {

    id: 7,

    title: 'Project Eta',

    description: 'Transforming ideas into reality',

    year: '2022',

  },

  {

    id: 8,

    title: 'Project Theta',

    description: 'Crafting memorable digital moments',

    year: '2022',

  },

];



interface ScalingScrollAreaProps {

  items?: ScrollItem[];

}



export default function ScalingScrollArea({ items = defaultItems }: ScalingScrollAreaProps) {

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [itemScales, setItemScales] = useState<number[]>(

    items.map(() => 1)

  );



  useEffect(() => {

    const handleScroll = () => {

      const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;

      if (!viewport) return;



      const viewportRect = viewport.getBoundingClientRect();

      const viewportBottom = viewportRect.bottom;

      const viewportHeight = viewportRect.height;



      const itemElements = viewport.querySelectorAll('[data-scroll-item]');

      const newScales: number[] = [];



      itemElements.forEach((element) => {

        const rect = element.getBoundingClientRect();

        const itemBottom = rect.bottom;

        const itemTop = rect.top;

        const itemCenter = (itemTop + itemBottom) / 2;



        const distanceFromBottom = viewportBottom - itemCenter;

        const maxDistance = viewportHeight * 0.8;

        const normalizedDistance = Math.max(0, Math.min(1, distanceFromBottom / maxDistance));

        

        const minScale = 0.7;

        const scale = minScale + (1 - minScale) * normalizedDistance;

        

        newScales.push(scale);

      });



      setItemScales(newScales);

    };



    const viewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;

    if (viewport) {

      handleScroll();

      viewport.addEventListener('scroll', handleScroll);

      

      return () => {

        viewport.removeEventListener('scroll', handleScroll);

      };

    }

  }, [items.length]);



  return (

    <div className="w-full h-screen flex items-center justify-center bg-black p-8">

      <div className="w-full max-w-7xl h-[600px] relative">

        <ScrollArea ref={scrollContainerRef} className="h-full w-full">

          <div className="px-8 py-12">

            <div className="grid grid-cols-3 gap-8">

              {items.map((item, index) => (

                <div

                  key={item.id}

                  data-scroll-item

                  className="transition-transform duration-300 ease-out origin-bottom"

                  style={{

                    transform: `scale(${itemScales[index] || 1})`,

                  }}

                >

                  <div className="cursor-pointer group">

                    <div className="aspect-[4/3] bg-muted rounded-lg mb-4 overflow-hidden">

                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />

                    </div>

                    <h3 className="text-xl font-bold text-white text-center group-hover:text-primary transition-colors">

                      {item.title}

                    </h3>

                  </div>

                </div>

              ))}

            </div>

            <div className="h-[400px]" />

          </div>

        </ScrollArea>

        

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      </div>

    </div>

  );

}

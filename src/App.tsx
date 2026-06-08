import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import Spotlight from './component/spotlight'
import { useEffect, useRef } from 'react'

gsap.registerPlugin(ScrollTrigger, SplitText)

function App() {
  const spotLightHeaderRef = useRef<HTMLHeadingElement>(null!)
  const spotLightSectionRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const lenis = new Lenis()
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })
    gsap.ticker.lagSmoothing(0)
  }, [])
  const leftGlareRef = useRef<SVGPathElement>(null!)
  const rightGlareRef = useRef<SVGPathElement>(null!)

  useEffect(() => {
    let leftLensCleanup: (() => void) | null = null
    let rightLensCleanup: (() => void) | null = null
    let defs: SVGDefsElement | null = null
    let headerSplit: SplitText | null = null

    const ctx = gsap.context(() => {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const lensImages: SVGImageElement[] = []
      const glareBands: { band: SVGRectElement; sweepDistance: number }[] = []
      const settings = {
        lenImagesURL: '/image.jpg',
        glaresPerLens: 2,
        finnalZoomScale: 22,
        zoomFocusPoint: '47% 21%',
      }

      const svg = leftGlareRef.current?.ownerSVGElement || rightGlareRef.current?.ownerSVGElement
      if (svg) {
        svg.insertBefore(defs, svg.firstChild)
      }

      const setupLens = (
        glareRef: React.RefObject<SVGPathElement>,
        clipPathId: string
      ) => {
        const currentGlare = glareRef.current
        if (!currentGlare) return null

        const parent = currentGlare.parentNode
        if (!parent) return null

        const lensBounds = (
          currentGlare.previousElementSibling as SVGGraphicsElement | null
        )?.getBBox?.()

        if (!lensBounds) return null

        const clipPath = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'clipPath',
        )
        clipPath.setAttribute('id', clipPathId)

        const previousSibling = currentGlare.previousElementSibling?.cloneNode(true)
        if (previousSibling) {
          clipPath.appendChild(previousSibling)
        }
        defs!.appendChild(clipPath)

        const lensGroup = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'g',
        )
        lensGroup.setAttribute('clip-path', `url(#${clipPathId})`)

        const lensImage = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'image',
        )
        lensImage.setAttribute('href', settings.lenImagesURL)
        lensImage.setAttribute('width', '100%')
        lensImage.setAttributeNS(
          'http://www.w3.org/1999/xlink',
          'xlink:href',
          settings.lenImagesURL,
        )
        lensImage.setAttribute('x', lensBounds.x.toString())
        lensImage.setAttribute('y', lensBounds.y.toString())
        lensImage.setAttribute('width', lensBounds.width.toString())
        lensImage.setAttribute('height', lensBounds.height.toString())
        lensImage.setAttribute('preserveAspectRatio', 'xMidYMid slice')
        lensImage.setAttribute('opacity', '0')
        lensGroup.appendChild(lensImage)
        lensImages.push(lensImage)

        const bandWidth = lensBounds.width * 0.22
        const sweepDistance = lensBounds.width + bandWidth * 2
        const spacingBetweenBands = sweepDistance / settings.glaresPerLens
        for (let i = 0; i < settings.glaresPerLens; i++) {
          const band = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'rect',
          )
          band.setAttribute(
            'x',
            (lensBounds.x + lensBounds.width * 0.3 - spacingBetweenBands * i).toString(),
          )
          band.setAttribute('y', (lensBounds.y - lensBounds.height * 0.25).toString())
          band.setAttribute('width', bandWidth.toString())
          band.setAttribute('height', (lensBounds.height * 1.5).toString())
          band.setAttribute('fill', '#fff')
          band.setAttribute('opacity', '0.6')
          lensGroup.appendChild(band)
          glareBands.push({ band, sweepDistance })
        }
        parent.insertBefore(lensGroup, currentGlare)
        currentGlare.remove()

        return () => {
          parent.insertBefore(currentGlare, lensGroup)
          lensGroup.remove()
        }
      }

      leftLensCleanup = setupLens(leftGlareRef, 'left-lens-clip')
      rightLensCleanup = setupLens(rightGlareRef, 'right-lens-clip')

      headerSplit = new SplitText(spotLightHeaderRef.current, {
        type: 'words',
      })
      gsap.set(headerSplit.words, { opacity: 0 })
      gsap.set(svg, { transformOrigin: settings.zoomFocusPoint, transformBox: 'fill-box' })

      ScrollTrigger.create({
        trigger: spotLightSectionRef.current,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 3,
        pin: true,
        pinSpacing: true,
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress
          const glareProgress = Math.min(progress / 0.75, 1)
          glareBands.forEach(({ band, sweepDistance }) => {
            gsap.set(band, { x: glareProgress * sweepDistance })
          })

          const scale = 1 + progress * 2 * (settings.finnalZoomScale - 1)
          gsap.set(svg, { scale: scale })
          if (progress >= 0.5) {
            const fadeProgress = (progress - 0.5) / 0.5
            lensImages.forEach((image) =>
              gsap.set(image, { opacity: fadeProgress })
            )
          } else {
            lensImages.forEach((image) =>
              gsap.set(image, { opacity: 0 })
            )
          }

          if (progress >= 0.65 && progress <= 0.85) {
            const textProgress = (progress - 0.65) / 0.2;
            const totalWords = headerSplit?.words?.length || 0;

            headerSplit?.words?.forEach((word, index) => {
              const wordRevealProgress = index / totalWords;
              if (wordRevealProgress <= textProgress) {
                gsap.set(word, { opacity: 1 });
              } else {
                gsap.set(word, { opacity: 0 });
              }
            })
          } else if (progress > 0.85) {
            gsap.set(headerSplit?.words, { opacity: 1 })
          } else if (progress < 0.65) {
            gsap.set(headerSplit?.words, { opacity: 0 })
          }
        }
      })
    })

    return () => {
      ctx.revert()
      if (headerSplit) headerSplit.revert()
      if (leftLensCleanup) leftLensCleanup()
      if (rightLensCleanup) rightLensCleanup()
      if (defs) defs.remove()
    }
  }, [])


  return (
    <>
      <section className='flex justify-center items-center text-center bg-[#252627]'>
        <h1>Scrolling May Cause Joy</h1>
      </section>

      <section ref={spotLightSectionRef} className='bg-[#eb5e55]'>
        <div className='absolute inset-0 h-full w-full'>
          <Spotlight
            leftGlareRef={leftGlareRef}
            rightGlareRef={rightGlareRef}
          />
        </div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center width-[40%] z-2'>
          <h1 ref={spotLightHeaderRef}>Insert Something Wildly Impressive Right Here</h1>
        </div>
      </section>

      <section className='flex justify-center items-center text-center bg-[#252627]'>
        <h1>Thanks for scrolling!</h1>
      </section>
    </>
  )
}

export default App

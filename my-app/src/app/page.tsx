"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import nerdamer from "nerdamer"
import "nerdamer/all"
import { Inter } from "next/font/google"
import { Calculator, Info, Lightbulb, Sparkles, X, ChevronDown, ChevronUp, Dices, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type Plotly from "plotly.js"

const inter = Inter({ subsets: ["latin"] })

// ✅ Dynamically import Plotly to avoid SSR hydration errors
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

// ✅ TypeScript: Define Plotly interface globally (optional but clean)
declare global {
  interface Window {
    Plotly: typeof Plotly
  }
}

export default function MathWebsite() {
  const [inputFunction, setInputFunction] = useState("")
  const [partialDerivatives, setPartialDerivatives] = useState<{
    dfdx: string
    dfdy: string
  } | null>(null)
  const [secondPartialDerivatives, setSecondPartialDerivatives] = useState<{
    d2fdx2: string
    d2fdy2: string
    d2fdxdy: string
    d2fdydx: string
  } | null>(null)
  const [criticalPoints, setCriticalPoints] = useState<{ point: string; type: string }[]>([])
  const [noCriticalPointsMessage, setNoCriticalPointsMessage] = useState<string | null>(null)
  const [plotData, setPlotData] = useState<Plotly.Data[] | null>(null)
  const [plotRange, setPlotRange] = useState<number>(5)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExamples, setShowExamples] = useState(false)
  const [expandEquations, setExpandEquations] = useState(false)
  const [expandCritical, setExpandCritical] = useState(false)

  const examples = [
    { name: "Paraboloid", func: "x^2 + y^2" },
    { name: "Saddle", func: "x^2 - y^2" },
    { name: "Teacher's Example", func: "x^3 + y^3-3x-3y" },
    { name: "Fourth Order", func: "x^4 + y^4 - 4*x^2 - 4*y^2" },
    { name: "Double Well", func: "(x^2 - 1)^2 + (y^2 - 1)^2" },
    { name: "Asymmetric Saddle", func: "x^2 - 2*y^2" },
    { name: "Steep Valley", func: "x^2 + 10*y^2" },
  ]

  const calculateDerivativesAndCriticalPoints = () => {
    if (!inputFunction.trim()) {
      setError("Please enter a function")
      return
    }

    setError(null)
    setIsCalculating(true)

    try {
      // Compute Partial Derivatives
      const dfdx = nerdamer(`diff(${inputFunction}, x)`).toString()
      const dfdy = nerdamer(`diff(${inputFunction}, y)`).toString()
      setPartialDerivatives({ dfdx, dfdy })

      // Compute Second Partial Derivatives
      const d2fdx2 = nerdamer(`diff(${dfdx}, x)`).toString()
      const d2fdy2 = nerdamer(`diff(${dfdy}, y)`).toString()
      const d2fdxdy = nerdamer(`diff(${dfdx}, y)`).toString()
      const d2fdydx = nerdamer(`diff(${dfdy}, x)`).toString()

      setSecondPartialDerivatives({ d2fdx2, d2fdy2, d2fdxdy, d2fdydx })

      // Check if derivatives are constants and not zero
      const isDfdxConstant = !nerdamer(dfdx).variables().length
      const isDfdyConstant = !nerdamer(dfdy).variables().length

      if ((isDfdxConstant && dfdx !== "0") || (isDfdyConstant && dfdy !== "0")) {
        setCriticalPoints([])
        setNoCriticalPointsMessage("No critical points (derivatives do not vanish).")
        generatePlotData(inputFunction, plotRange, [])
        setIsCalculating(false)
        return
      }

      const eq1 = `${dfdx} = 0`
      const eq2 = `${dfdy} = 0`

      const xSolutions = nerdamer(eq1).solveFor("x")
      const ySolutions = nerdamer(eq2).solveFor("y")

      const formattedSolutions: { point: string; type: string }[] = []
      if (Array.isArray(xSolutions) && Array.isArray(ySolutions)) {
        xSolutions.forEach((xSol: nerdamer.Expression) => {
          ySolutions.forEach((ySol: nerdamer.Expression) => {
            const xValue = xSol.toString()
            const yValue = ySol.toString()

            const d2fdx2Value = nerdamer(d2fdx2.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()
            const d2fdy2Value = nerdamer(d2fdy2.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()
            const d2fdxdyValue = nerdamer(d2fdxdy.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()

            const D = nerdamer(`${d2fdx2Value} * ${d2fdy2Value} - (${d2fdxdyValue})^2`).evaluate().toString()

            let type = ""
            if (nerdamer(D).gt(0)) {
              if (nerdamer(d2fdx2Value).gt(0)) {
                type = "Local Minimum"
              } else {
                type = "Local Maximum"
              }
            } else if (nerdamer(D).lt(0)) {
              type = "Saddle Point"
            } else {
              type = "Inconclusive (D = 0)"
            }

            formattedSolutions.push({
              point: `(x = ${xValue}, y = ${yValue})`,
              type,
            })
          })
        })
      } else {
        const xValue = xSolutions.toString()
        const yValue = ySolutions.toString()

        const d2fdx2Value = nerdamer(d2fdx2.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()
        const d2fdy2Value = nerdamer(d2fdy2.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()
        const d2fdxdyValue = nerdamer(d2fdxdy.replace(/x/g, xValue).replace(/y/g, yValue)).evaluate().toString()

        const D = nerdamer(`${d2fdx2Value} * ${d2fdy2Value} - (${d2fdxdyValue})^2`).evaluate().toString()

        let type = ""
        if (nerdamer(D).gt(0)) {
          if (nerdamer(d2fdx2Value).gt(0)) {
            type = "Local Minimum"
          } else {
            type = "Local Maximum"
          }
        } else if (nerdamer(D).lt(0)) {
          type = "Saddle Point"
        } else {
          type = "Inconclusive (D = 0)"
        }

        formattedSolutions.push({
          point: `(x = ${xValue}, y = ${yValue})`,
          type,
        })
      }

      setCriticalPoints(formattedSolutions)
      setNoCriticalPointsMessage(null)

      generatePlotData(inputFunction, plotRange, formattedSolutions)

      if (formattedSolutions.length > 0) {
        setExpandCritical(true)
      }
      setExpandEquations(true)
    } catch (error) {
      console.error("Error computing derivatives or solving system:", error)
      setCriticalPoints([])
      setNoCriticalPointsMessage(null)
      setError("Error in computation. Please check your function syntax.")
    } finally {
      setIsCalculating(false)
    }
  }

  const generatePlotData = (func: string, range: number, criticalPoints: { point: string; type: string }[]) => {
    try {
      const points = 50
      const xValues: number[] = []
      const yValues: number[] = []
      const zMatrix: number[][] = []

      for (let i = -range; i <= range; i += (2 * range) / points) {
        xValues.push(i)
        yValues.push(i)
      }

      for (let i = 0; i < xValues.length; i++) {
        zMatrix[i] = []
        for (let j = 0; j < yValues.length; j++) {
          const currentFunc = func.replace(/x/g, `(${xValues[i]})`).replace(/y/g, `(${yValues[j]})`)

          try {
            const zValue = nerdamer(currentFunc).evaluate().toDecimal()
            zMatrix[i][j] = Number.parseFloat(zValue)
          } catch {
            zMatrix[i][j] = Number.NaN
          }
        }
      }

      const cpX: number[] = []
      const cpY: number[] = []
      const cpZ: number[] = []
      const cpTypes: string[] = []

      criticalPoints.forEach((point) => {
        const match = point.point.match(/x = (.*?), y = (.*?)\)/)
        if (match) {
          const xVal = Number.parseFloat(match[1])
          const yVal = Number.parseFloat(match[2])

          if (!isNaN(xVal) && !isNaN(yVal) && Math.abs(xVal) <= range && Math.abs(yVal) <= range) {
            cpX.push(xVal)
            cpY.push(yVal)

            const currentFunc = func.replace(/x/g, `(${xVal})`).replace(/y/g, `(${yVal})`)
            try {
              const zVal = nerdamer(currentFunc).evaluate().toDecimal()
              cpZ.push(Number.parseFloat(zVal))
            } catch {
              cpZ.push(0)
            }

            cpTypes.push(point.type)
          }
        }
      })

      // Create plot data with proper types
      const surfaceData: Plotly.Data = {
        x: xValues,
        y: yValues,
        z: zMatrix,
        type: "surface",
        colorscale: "Viridis",
        opacity: 0.9,
        name: "Function Surface",
        showscale: false,
        contours: {
          coloring: "fill",
        },
      }

      const criticalPointsData: Plotly.Data = {
        x: cpX,
        y: cpY,
        z: cpZ,
        mode: "markers",
        type: "scatter3d",
        marker: {
          size: 8,
          color: cpTypes.map((type) => {
            if (type.includes("Maximum")) return "rgb(255, 65, 54)"
            if (type.includes("Minimum")) return "rgb(46, 204, 113)"
            if (type.includes("Saddle")) return "rgb(30, 144, 255)"
            return "rgb(255, 215, 0)"
          }),
          symbol: "diamond",
          line: {
            color: "white",
            width: 1,
          },
        },
        name: "Critical Points",
        text: cpTypes,
        hoverinfo: "text",
      }

      setPlotData([surfaceData, criticalPointsData])
    } catch (error) {
      console.error("Error generating plot data:", error)
      setPlotData(null)
      setError("Error generating plot. Please check your function or try a different range.")
    }
  }

  const applyExample = (func: string) => {
    setInputFunction(func)
    setShowExamples(false)
  }

  const randomizeExample = () => {
    const randomIndex = Math.floor(Math.random() * examples.length)
    setInputFunction(examples[randomIndex].func)
  }

  return (
    <main
      className={`min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-slate-100 ${inter.className} overflow-hidden`}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-40 right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 pt-16 sm:pt-20 pb-10 sm:pb-12 relative z-10">
        <div className="mb-16 sm:mb-20 relative">
          <div className="text-center space-y-6">
            <div className="inline-block">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="h-8 w-8 text-cyan-400 animate-bounce" />
                <span className="text-sm font-bold text-cyan-400 tracking-widest uppercase">Advanced Mathematics</span>
                <Zap className="h-8 w-8 text-cyan-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter">
              <span className="gradient-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                Critical Points
              </span>
              <br />
              <span className="gradient-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">Explorer</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Visualize multivariable functions in stunning 3D with AI-powered analysis of critical points, maxima,
              minima, and saddle points.
            </p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8 mx-auto max-w-7xl">
          {/* Left Column */}
          <div className="flex-1 space-y-8">
            {/* Function Input Card */}
            <div className="glass-effect-strong rounded-2xl p-6 sm:p-8 glow-purple">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold gradient-text bg-gradient-to-r from-purple-300 to-pink-300">
                  Function Input
                </h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-lg font-bold text-cyan-300">f(x,y) =</label>
                  <div className="relative">
                    <Input
                      value={inputFunction}
                      onChange={(e) => setInputFunction(e.target.value)}
                      className="mt-2 glass-effect rounded-xl text-amber-50 placeholder:text-slate-300 focus-visible:ring-cyan-500 border-cyan-500/30 text-lg py-3"
                      placeholder="Select an example"
                      readOnly
                    />
                    {inputFunction && (
                      <button
                        onClick={() => setInputFunction("")}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setShowExamples(!showExamples)}
                    className="glass-effect rounded-lg text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 border-purple-500/30 cursor-pointer transition-all"
                    variant="ghost"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" /> Examples
                  </Button>

                  <Button
                    onClick={randomizeExample}
                    className="glass-effect rounded-lg text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 border-cyan-500/30 cursor-pointer transition-all"
                    variant="ghost"
                  >
                    <Dices className="h-4 w-4 mr-2" /> Random
                  </Button>
                </div>

                {showExamples && (
                  <div className="glass-effect rounded-xl p-4 space-y-3 border-purple-500/30">
                    <p className="text-sm text-slate-300 font-semibold">Quick Examples:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {examples.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => applyExample(example.func)}
                          className="glass-effect rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-purple-500/30 border-purple-500/30 transition-all card-hover"
                        >
                          {example.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-cyan-300">Plot Range:</label>
                    <span className="text-sm text-slate-400">± {plotRange}</span>
                  </div>
                  <Input
                    type="range"
                    value={plotRange}
                    onChange={(e) => setPlotRange(Number.parseFloat(e.target.value) || 5)}
                    className="w-full cursor-pointer"
                    min="1"
                    max="20"
                    step="1"
                  />
                </div>

                <Button
                  onClick={calculateDerivativesAndCriticalPoints}
                  disabled={isCalculating}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl glow-purple transition-all cursor-pointer"
                >
                  {isCalculating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Analyze Function
                    </span>
                  )}
                </Button>
              </div>

              {error && (
                <Alert className="mt-6 glass-effect border-red-500/30 bg-red-500/10">
                  <Info className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* 3D Visualization */}
            {plotData && (
              <div className="glass-effect-strong rounded-2xl p-6 sm:p-8 glow-cyan">
                <h2 className="text-2xl sm:text-3xl font-bold gradient-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-2">
                  3D Visualization
                </h2>
                <p className="text-slate-400 text-sm mb-6">Interactive surface with critical points highlighted</p>

                <div className="bg-slate-900/50 rounded-xl border border-cyan-500/20 overflow-hidden h-[280px] sm:h-[400px] md:h-[500px] shadow-2xl shadow-cyan-500/20">
                  <Plot
                    data={plotData}
                    layout={{
                      paper_bgcolor: "rgba(15,23,42,0.5)",
                      plot_bgcolor: "rgba(15,23,42,0.5)",
                      font: { family: "Inter, system-ui, sans-serif", color: "rgba(226,232,240,0.8)" },
                      margin: { l: 0, r: 0, b: 0, t: 60 },
                      title: {
                        text: `f(x,y) = ${inputFunction}`,
                        font: { size: 16, color: "rgba(226,232,240,0.8)" },
                        y: 0.95,
                        x: 0.5,
                        xanchor: "center",
                      },
                      scene: {
                        xaxis: { title: "x", color: "rgba(226,232,240,0.8)" },
                        yaxis: { title: "y", color: "rgba(226,232,240,0.8)" },
                        zaxis: { title: "f(x,y)", color: "rgba(226,232,240,0.8)" },
                        camera: { eye: { x: 1.5, y: 1.5, z: 1 } },
                      },
                      showlegend: false,
                    }}
                    config={{
                      responsive: true,
                      displaylogo: false,
                    }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>

                <div className="mt-6 glass-effect rounded-xl p-4 border-cyan-500/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></span>
                      <span className="text-sm text-slate-300">Maximum</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500  shadow-lg shadow-green-500/50"></span>
                      <span className="text-sm text-slate-300">Minimum</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
                      <span className="text-sm text-slate-300">Saddle</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"></span>
                      <span className="text-sm text-slate-300">Inconclusive</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation Cards */}
            <div className="glass-effect-strong rounded-2xl p-6 sm:p-8 glow-pink">
              <h3 className="text-2xl font-bold gradient-text bg-gradient-to-r from-pink-300 to-purple-300 mb-6">
                Understanding Critical Points
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Maximum */}
                <div className="glass-effect rounded-xl p-4 border-red-500/30 hover:border-red-500/60 transition-all card-hover">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-xl">⬆️</span>
                  </div>
                  <h4 className="font-bold text-red-300 mb-2">Local Maximum</h4>
                  <p className="text-slate-400  text-sm">Higher than all nearby points</p>
                </div>

                {/* Minimum */}
                <div className="glass-effect rounded-xl p-4 border-green-500/30 hover:border-green-500/60 transition-all card-hover">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-xl">⬇️</span>
                  </div>
                  <h4 className="font-bold text-green-300 mb-2">Local Minimum</h4>
                  <p className="text-slate-400  text-sm">Lower than all nearby points</p>
                </div>

                {/* Saddle */}
                <div className="glass-effect rounded-xl p-4 border-blue-500/30 hover:border-blue-500/60 transition-all card-hover">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-xl">↔️</span>
                  </div>
                  <h4 className="font-bold text-blue-300 mb-2">Saddle Point</h4>
                  <p className="text-slate-400  text-sm">Max in one direction, min in another</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Derivatives and Critical Points */}
          <div className="xl:w-2/5 space-y-8">
            {/* Equations Section */}
            <div className="glass-effect-strong rounded-2xl p-6 sm:p-8 glow-purple">
              <button
                onClick={() => setExpandEquations(!expandEquations)}
                className="flex items-center justify-between w-full mb-6 group cursor-pointer"
              >
                <h2 className="text-2xl font-bold gradient-text bg-gradient-to-r from-pink-300  to-purple-300 flex items-center gap-3">
                
                  Derivatives
                </h2>
                <div className="p-2 rounded-full bg-slate-700/50 group-hover:bg-pink-100/50 transition-colors">
                  {expandEquations ? (
                    <ChevronUp className="h-5 w-5 text-slate-300" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-300" />
                  )}
                </div>
              </button>

              {expandEquations && (
                <div className="space-y-6">
                  {/* First Derivatives */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-purple-300">First Partial Derivatives</h3>
                    {partialDerivatives ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="glass-effect rounded-lg p-4 border-purple-500/30">
                          <div className="text-purple-300  mb-2 font-bold">∂f/∂x =</div>
                          <div className=" text-amber-50 break-all">{partialDerivatives.dfdx}</div>
                        </div>
                        <div className="glass-effect rounded-lg p-4 border-cyan-500/30">
                          <div className="text-cyan-300  mb-2 font-bold">∂f/∂y =</div>
                          <div className=" text-amber-50 break-all">{partialDerivatives.dfdy}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300  text-md">No derivatives calculated yet</div>
                    )}
                  </div>

                  {/* Second Derivatives */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-cyan-300">Second Partial Derivatives</h3>
                    {secondPartialDerivatives ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="glass-effect rounded-lg p-3 border-purple-500/30">
                          <div className="text-purple-300 mb-1 font-bold">∂²f/∂x²</div>
                          <div className=" text-amber-50 break-all">
                            {secondPartialDerivatives.d2fdx2}
                          </div>
                        </div>
                        <div className="glass-effect rounded-lg p-3 border-cyan-500/30">
                          <div className="text-cyan-300  mb-1 font-bold">∂²f/∂y²</div>
                          <div className=" text-amber-50 break-all">
                            {secondPartialDerivatives.d2fdy2}
                          </div>
                        </div>
                        <div className="glass-effect rounded-lg p-3 border-cyan-500/30">
                          <div className="text-cyan-300 mb-1 font-bold">∂²f/∂x∂y</div>
                          <div className=" text-amber-50 break-all">
                            {secondPartialDerivatives.d2fdxdy}
                          </div>
                        </div>
                        <div className="glass-effect rounded-lg p-3 border-purple-500/30">
                          <div className="text-purple-300  mb-1 font-bold">∂²f/∂y∂x</div>
                          <div className=" text-amber-50 break-all">
                            {secondPartialDerivatives.d2fdydx}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300  text-md">No second derivatives calculated yet</div>
                    )}
                  </div>
                       {/* Hessian Determinant section */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-indigo-300">Hessian Determinant</h3>
                    <div className="glass-effect rounded-lg p-4 border-indigo-500/30">
                      <div className=" text-slate-200 text-center mb-3">
                        D = (∂²f/∂x²)(∂²f/∂y²) - (∂²f/∂x∂y)²
                      </div>
                      <p className="text-md text-indigo-200/80 mb-3">
                        The sign of the Hessian determinant D determines the type of critical point:
                      </p>
                      <ul className="space-y-2 text-md text-slate-300">
                        <li className="flex items-center gap-2">
                          <span className="text-green-400 font-bold">•</span> D &gt; 0, ∂²f/∂x² &gt; 0:{" "}
                          <span className="text-green-300 font-semibold">Local Minimum</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-red-400 font-bold">•</span> D &gt; 0, ∂²f/∂x² &lt; 0:{" "}
                          <span className="text-red-300 font-semibold">Local Maximum</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400 font-bold">•</span> D &lt; 0:{" "}
                          <span className="text-blue-300 font-semibold">Saddle Point</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold">•</span> D = 0:{" "}
                          <span className="text-yellow-300 font-semibold">Inconclusive</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
               
                
              )}

            </div>
          
            {/* Critical Points */}
            <div className="glass-effect-strong rounded-2xl p-6 sm:p-8 glow-cyan">
              <button
                onClick={() => setExpandCritical(!expandCritical)}
                className="flex items-center justify-between w-full mb-6 group cursor-pointer"
              >
                <h2 className="text-2xl font-bold gradient-text bg-gradient-to-r from-cyan-300 to-purple-300 flex items-center gap-3">
                  
                  Critical Points
                </h2>
                <div className="p-2 rounded-full bg-slate-700/50 group-hover:bg-cyan-100/50 transition-colors">
                  {expandCritical ? (
                    <ChevronUp className="h-5 w-5 text-slate-300" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-300" />
                  )}
                </div>
              </button>

              {expandCritical && (
                <div className="space-y-4">
                  {noCriticalPointsMessage ? (
                    <div className="glass-effect border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 font-medium mb-1 text-yellow-300">
                        <Info className="h-4 w-4" />
                        <span>No Critical Points Found</span>
                      </div>
                      <p className="text-yellow-200 text-md">{noCriticalPointsMessage}</p>
                    </div>
                  ) : criticalPoints.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-cyan-300 font-semibold">
                        Found {criticalPoints.length} critical point{criticalPoints.length !== 1 ? "s" : ""}:
                      </p>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {criticalPoints.map((point, index) => (
                          <div
                            key={index}
                            className={`
                              glass-effect rounded-lg p-4 
                              ${
                                point.type.includes("Maximum")
                                  ? "border-red-500/30 hover:border-red-500/60"
                                  : point.type.includes("Minimum")
                                    ? "border-green-500/30 hover:border-green-500/60"
                                    : point.type.includes("Saddle")
                                      ? "border-blue-500/30 hover:border-blue-500/60"
                                      : "border-yellow-500/30 hover:border-yellow-500/60"
                              }
                            `}
                          >
                            <Badge
                              className={`
                                mb-2 text-sm
                                ${
                                  point.type.includes("Maximum")
                                    ? "bg-red-500/30 text-red-200 hover:bg-red-500/30"
                                    : point.type.includes("Minimum")
                                      ? "bg-green-500/30 text-green-200 hover:bg-green-500/30"
                                      : point.type.includes("Saddle")
                                        ? "bg-blue-500/30 text-blue-200 hover:bg-blue-500/30"
                                        : "bg-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30"
                                }
                              `}
                            >
                              {point.type}
                            </Badge>
                            <div className=" text-md text-amber-50">{point.point}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3 opacity-50">∫</div>
                      <p className="text-slate-400">Enter a function and click Analyze to find critical points</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

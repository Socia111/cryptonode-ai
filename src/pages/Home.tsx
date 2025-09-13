import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SignalsWidget from '@/components/SignalsWidget';
import TradingSystemTest from '@/components/TradingSystemTest';
import { 
  Shield, 
  Zap, 
  Globe, 
  HeadphonesIcon, 
  TrendingUp, 
  Users,
  Bot,
  TestTube,
  Award,
  Mail,
  Phone,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/20 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-24">
          <div className="text-center space-y-8">
            <div className="relative">
              <h1 className="text-6xl font-bold mb-4">
                <span className="text-foreground">Robots</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-violet-500 to-purple-600 bg-clip-text text-transparent">
                  Time
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-2">Time to trust</p>
              <p className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                trading for robots!
              </p>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Try free automated trading system based on artificial intelligence for trading, 
              digital currencies and stock market.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-8 py-3">
                <Download className="w-5 h-5 mr-2" />
                Get and Install
              </Button>
              <Button variant="outline" size="lg" className="border-purple-500 text-purple-400 hover:bg-purple-500/10 px-8 py-3">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Floating 3D Cube Effect */}
        <div className="absolute top-1/2 right-10 transform -translate-y-1/2 opacity-20">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500/30 to-violet-600/30 rounded-lg backdrop-blur-sm border border-purple-400/20 animate-pulse-glow"></div>
        </div>
      </section>

      {/* Live Signals Preview */}
      <section className="py-8 bg-gradient-to-r from-purple-950/5 to-violet-950/5">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            <SignalsWidget maxItems={3} className="bg-card/80 backdrop-blur-sm" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-to-r from-purple-950/10 to-violet-950/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/40 transition-all">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Get and Install</h3>
                <p className="text-muted-foreground">
                  Submit a request and get a trading robot on your e-mail
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/40 transition-all">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TestTube className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Connect and Test</h3>
                <p className="text-muted-foreground">
                  Connect and test the trading robot on a demo account
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/40 transition-all">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Set up and Earn</h3>
                <p className="text-muted-foreground">
                  Set up a trading robot and achieve your personal financial goals!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Investment Growth Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Watch <span className="bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
              your investment grow
            </span>
          </h2>
          
          <Card className="max-w-2xl mx-auto mt-8 bg-gradient-to-br from-purple-950/20 to-violet-950/20 border-purple-500/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <Bot className="w-12 h-12 text-purple-400 mr-4" />
                <div>
                  <h3 className="text-2xl font-bold">Unireli Smart Machine 2.2</h3>
                  <p className="text-muted-foreground">Advanced AI Trading System</p>
                </div>
              </div>
              <p className="text-lg mb-4">
                Trading robot with protection against price fluctuations. Ideal for intraday trading.
              </p>
              <div className="text-3xl font-bold text-green-400">
                Average monthly profitability: 5%
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Unireli Section */}
      <section className="py-16 bg-gradient-to-r from-purple-950/10 to-violet-950/10">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">
            Why <span className="bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
              Unireli
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <Shield className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Safety</h3>
                <p className="text-muted-foreground">
                  Test the robot on a demo account
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <Award className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Reliability</h3>
                <p className="text-muted-foreground">
                  Our partners - only licensed brokers
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <Zap className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Technological</h3>
                <p className="text-muted-foreground">
                  Every robot is the result of long-term work of our team with more than 15 years of experience
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <HeadphonesIcon className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">24/7 Support</h3>
                <p className="text-muted-foreground">
                  24/7 support in 8 languages. We will answer any of your questions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <Globe className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Global</h3>
                <p className="text-muted-foreground">
                  Trade from over 20 countries on exchange and non-exchange markets
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <Users className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Recommended</h3>
                <p className="text-muted-foreground">
                  More than 70% of our software users use them on the recommendation of other traders
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-purple-600/10 to-violet-600/10">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">
              Get it <span className="bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                working now!
              </span>
            </h2>

            <Card className="bg-card/80 backdrop-blur-sm border-purple-500/30">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Name" 
                      className="border-purple-500/30 focus:border-purple-400"
                    />
                    <Input 
                      placeholder="E-mail" 
                      type="email"
                      className="border-purple-500/30 focus:border-purple-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border border-purple-500/30 rounded-md bg-background text-foreground">
                      <option>+34</option>
                      <option>+1</option>
                      <option>+44</option>
                    </select>
                    <Input 
                      placeholder="Your phone" 
                      className="flex-1 border-purple-500/30 focus:border-purple-400"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-3"
                  >
                    Get Started Now
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    By clicking on the submit button, you agree to the processing of your personal data
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Access to Existing Platform */}
      <section className="py-8 border-t border-purple-500/20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground mb-4">
            Ready to access the advanced trading platform?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Link to="/auth">Sign In / Register</Link>
            </Button>
            <Button variant="outline" asChild className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Link to="/trade">Live Trading</Link>
            </Button>
            <Button variant="outline" asChild className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Link to="/signals">View Signals</Link>
            </Button>
            <Button variant="outline" asChild className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Link to="/portfolio">Portfolio</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trading System Test - Development Only */}
      <section className="py-8 border-t border-purple-500/20">
        <div className="container mx-auto px-6">
          <TradingSystemTest />
        </div>
      </section>
    </div>
  );
};

export default Home;
/**
 * Launch Data Service
 * Fetches real-time launch data from Launch Library API
 * https://ll.thespacedevs.com/2.2.0/
 */

const fetch = require('node-fetch');
const mongoose = require('mongoose');

// Schema for caching launch data
const launchSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  status: String,
  net: Date,
  rocket: {
    name: String,
    configuration: {
      name: String,
      family: String
    }
  },
  mission: {
    name: String,
    description: String,
    type: String
  },
  pad: {
    name: String,
    location: {
      name: String
    }
  },
  program: [{
    name: String
  }],
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { timestamps: true });

const Launch = mongoose.models.Launch || mongoose.model('Launch', launchSchema);

class LaunchDataService {
  constructor() {
    this.baseUrl = 'https://ll.thespacedevs.com/2.2.0';
    this.cacheTTL = 60 * 60 * 1000; // 1 hour cache
  }

  /**
   * Get recent SpaceX launches
   * @param {number} limit - Number of launches to fetch (default: 10)
   * @param {boolean} useCache - Whether to use cached data (default: true)
   */
  async getRecentSpaceXLaunches(limit = 10, useCache = true) {
    try {
      // Check cache first
      if (useCache) {
        const cached = await Launch.find({
          expiresAt: { $gt: new Date() }
        })
          .sort({ net: -1 })
          .limit(limit)
          .lean();

        if (cached.length >= limit) {
          console.log(`[LaunchData] Using cached data (${cached.length} launches)`);
          return cached;
        }
      }

      // Fetch from API - Need to fetch more and filter since API filter may not work
      // Fetch more results to ensure we get SpaceX launches (both past and future)
      // Use ordering by -net to get most recent first
      const fetchLimit = Math.max(limit * 20, 500); // Fetch more to get past launches
      const response = await fetch(
        `${this.baseUrl}/launch/?mode=detailed&limit=${fetchLimit}&ordering=-net`
      );

      if (!response.ok) {
        throw new Error(`Launch Library API error: ${response.statusText}`);
      }

      const data = await response.json();
      let launches = data.results || [];
      
      // Filter to only SpaceX launches (agency ID 121)
      launches = launches.filter(launch => {
        const provider = launch.launch_service_provider;
        return provider && provider.id === 121;
      });
      
      // Separate past and future launches
      const now = new Date();
      const pastLaunches = launches.filter(l => {
        if (!l.net) return false;
        const launchDate = new Date(l.net);
        return launchDate < now;
      });
      
      const futureLaunches = launches.filter(l => {
        if (!l.net) return true; // Include TBD launches
        const launchDate = new Date(l.net);
        return launchDate >= now;
      });
      
      // Prioritize past launches for stats, but include some future ones
      const result = [...pastLaunches.slice(0, Math.floor(limit * 0.7)), ...futureLaunches.slice(0, Math.ceil(limit * 0.3))];
      launches = result.slice(0, limit);

      // Cache results (skip caching if MongoDB not connected)
      let cachePromises = [];
      try {
        cachePromises = launches.map(launch => {
          // Ensure ID is a string
          const launchId = typeof launch.id === 'string' ? launch.id : (launch.id?.toString() || String(launch.id));
          
          const launchData = {
            id: launchId,
            name: launch.name || 'Unknown',
            status: launch.status?.name || 'Unknown',
            net: launch.net ? new Date(launch.net) : null,
            rocket: {
              name: launch.rocket?.name || 'Unknown',
              configuration: {
                name: launch.rocket?.configuration?.name || 'Unknown',
                family: launch.rocket?.configuration?.family || 'Unknown'
              }
            },
            mission: {
              name: launch.mission?.name || null,
              description: launch.mission?.description || null,
              type: launch.mission?.type || null
            },
            pad: {
              name: launch.pad?.name || null,
              location: {
                name: launch.pad?.location?.name || null
              }
            },
            program: launch.program?.map(p => ({ name: p.name })) || [],
            expiresAt: new Date(Date.now() + this.cacheTTL)
          };

          return Launch.findOneAndUpdate(
            { id: launchId },
            launchData,
            { upsert: true, new: true }
          ).catch(err => {
            console.warn(`[LaunchData] Cache error for launch ${launchId}:`, err.message);
            return null;
          });
        });
        
        await Promise.all(cachePromises.filter(p => p !== null));
        console.log(`[LaunchData] Fetched and cached ${launches.length} SpaceX launches`);
      } catch (cacheError) {
        console.warn('[LaunchData] Cache operation failed, continuing without cache:', cacheError.message);
      }

      await Promise.all(cachePromises);
      console.log(`[LaunchData] Fetched and cached ${launches.length} launches`);

      return launches;
    } catch (error) {
      console.error('[LaunchData] Error fetching launches:', error);
      // Return cached data even if expired as fallback
      const fallback = await Launch.find({})
        .sort({ net: -1 })
        .limit(limit)
        .lean();

      return fallback;
    }
  }

  /**
   * Get SpaceX launch statistics
   */
  async getSpaceXLaunchStats() {
    try {
      // Fetch both past and upcoming launches to get accurate stats
      const pastLaunches = await this.getRecentSpaceXLaunches(100, false);
      
      // Also fetch upcoming launches
      let upcomingLaunches = [];
      try {
        const upcomingResponse = await fetch(
          `${this.baseUrl}/launch/upcoming/?mode=detailed&limit=50&ordering=net`
        );
        if (upcomingResponse.ok) {
          const upcomingData = await upcomingResponse.json();
          upcomingLaunches = (upcomingData.results || []).filter(launch => {
            const provider = launch.launch_service_provider;
            return provider && provider.id === 121;
          });
        }
      } catch (err) {
        console.warn('[LaunchData] Error fetching upcoming launches:', err.message);
      }
      
      // Combine and deduplicate by ID
      const allLaunches = [...pastLaunches];
      const upcomingIds = new Set(upcomingLaunches.map(l => l.id));
      upcomingLaunches.forEach(l => {
        if (!upcomingIds.has(l.id) || !allLaunches.find(existing => existing.id === l.id)) {
          allLaunches.push(l);
        }
      });
      
      const launches = allLaunches.slice(0, 100);
      
      if (!launches || launches.length === 0) {
        console.log('[LaunchData] No launches found, returning empty stats');
        return {
          total: 0,
          successful: 0,
          failed: 0,
          upcoming: 0,
          successRate: 0,
          starlinkLaunches: 0,
          recentLaunches: []
        };
      }
      
      // Helper to get status string (handle both object and string)
      const getStatusString = (status) => {
        if (!status) return '';
        if (typeof status === 'string') return status.toLowerCase();
        if (typeof status === 'object' && status.name) return status.name.toLowerCase();
        return String(status).toLowerCase();
      };
      
      const stats = {
        total: launches.length,
        successful: launches.filter(l => {
          const status = getStatusString(l.status);
          return status.includes('success') || status.includes('landed');
        }).length,
        failed: launches.filter(l => {
          const status = getStatusString(l.status);
          return status.includes('fail') || status.includes('failure');
        }).length,
        upcoming: launches.filter(l => {
          const status = getStatusString(l.status);
          return status.includes('go') || status.includes('tbd') || status.includes('scheduled') || status.includes('to be determined');
        }).length,
        successRate: 0,
        starlinkLaunches: launches.filter(l => {
          const missionName = (l.mission?.name || '').toLowerCase();
          const missionDesc = (l.mission?.description || '').toLowerCase();
          const launchName = (l.name || '').toLowerCase();
          return missionName.includes('starlink') || missionDesc.includes('starlink') || launchName.includes('starlink');
        }).length,
        recentLaunches: launches.slice(0, 5).map(l => {
          const statusObj = l.status;
          const statusStr = typeof statusObj === 'string' ? statusObj : (statusObj?.name || 'Unknown');
          return {
            name: l.name || 'Unknown',
            date: l.net,
            status: statusStr,
            mission: l.mission?.name || null
          };
        })
      };

      if (stats.total > 0) {
        stats.successRate = (stats.successful / stats.total) * 100;
      }

      console.log(`[LaunchData] Calculated stats: ${stats.total} total, ${stats.successful} successful, ${stats.starlinkLaunches} Starlink`);
      return stats;
    } catch (error) {
      console.error('[LaunchData] Error calculating stats:', error);
      console.error('[LaunchData] Error stack:', error.stack);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        upcoming: 0,
        successRate: 0,
        starlinkLaunches: 0,
        recentLaunches: []
      };
    }
  }

  /**
   * Get upcoming SpaceX launches
   */
  async getUpcomingLaunches(limit = 5) {
    try {
      const response = await fetch(
        `${this.baseUrl}/launch/upcoming/?mode=detailed&limit=${limit}&launch_service_provider=121&ordering=net`
      );

      if (!response.ok) {
        throw new Error(`Launch Library API error: ${response.statusText}`);
      }

      const data = await response.json();
      let launches = data.results || [];
      
      // Filter to only SpaceX launches
      launches = launches.filter(launch => {
        const provider = launch.launch_service_provider;
        return provider && (provider.id === 121 || provider.name === 'SpaceX');
      });
      
      return launches;
    } catch (error) {
      console.error('[LaunchData] Error fetching upcoming launches:', error);
      return [];
    }
  }

  /**
   * Get Starship-specific launches
   */
  async getStarshipLaunches(limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/launch/?mode=detailed&limit=${limit}&rocket__configuration__name__icontains=Starship&ordering=-net`
      );

      if (!response.ok) {
        throw new Error(`Launch Library API error: ${response.statusText}`);
      }

      const data = await response.json();
      let launches = data.results || [];
      
      // Filter to only SpaceX launches
      launches = launches.filter(launch => {
        const provider = launch.launch_service_provider;
        return provider && (provider.id === 121 || provider.name === 'SpaceX');
      });
      
      return launches;
    } catch (error) {
      console.error('[LaunchData] Error fetching Starship launches:', error);
      return [];
    }
  }
}

module.exports = LaunchDataService;


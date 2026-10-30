import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';

describe('Marketplace profiles, favorites, messaging and RFQs', () => {
  let prisma:any;
  let audit:any;
  let service:MarketplaceService;
  beforeEach(()=>{
    prisma={
      marketplaceFeatureFlag:{findUnique:jest.fn().mockResolvedValue({enabled:true})},
      marketplaceSellerProfile:{findUnique:jest.fn().mockResolvedValue({id:'profile-1',userId:'seller-1',showPhone:false,publicPhone:'+911234567890',user:{id:'seller-1',name:'Seller',isVerified:true,userType:'FARMER'}}),upsert:jest.fn()},
      user:{findUnique:jest.fn().mockResolvedValue({id:'seller-1',name:'Seller',isVerified:true,userType:'FARMER'})},
      marketplaceFavorite:{findMany:jest.fn().mockResolvedValue([]),findUnique:jest.fn().mockResolvedValue(null),upsert:jest.fn().mockResolvedValue({id:'favorite-1',listingId:'listing-1',status:'ACTIVE'}),update:jest.fn().mockResolvedValue({id:'favorite-1',status:'REMOVED'})},
      marketplaceListing:{findFirst:jest.fn().mockResolvedValue({id:'listing-1',sellerId:'seller-2',status:'PUBLISHED',deletedAt:null}),findUnique:jest.fn()},
      marketplaceMessage:{findMany:jest.fn().mockResolvedValue([]),findUnique:jest.fn(),findFirst:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue({id:'message-1',body:'Hello'}),update:jest.fn()},
      marketplaceOrder:{findUnique:jest.fn().mockResolvedValue({id:'order-1',buyerId:'buyer-1',sellerId:'seller-2',listingId:'listing-1',status:'ACCEPTED'}),count:jest.fn().mockResolvedValue(0)},
      marketplaceReview:{aggregate:jest.fn().mockResolvedValue({_count:{_all:0},_avg:{rating:null}})},
      marketplaceRFQ:{create:jest.fn().mockResolvedValue({id:'rfq-1',status:'OPEN'}),findUnique:jest.fn().mockResolvedValue({id:'rfq-1',buyerId:'buyer-1',status:'OPEN'}),findMany:jest.fn().mockResolvedValue([]),update:jest.fn().mockResolvedValue({id:'rfq-1',status:'AWARDED'})},
      marketplaceRFQResponse:{upsert:jest.fn().mockResolvedValue({id:'response-1',status:'SUBMITTED'}),findUnique:jest.fn().mockResolvedValue({id:'response-1',rfqId:'rfq-1',status:'SUBMITTED',rfq:{id:'rfq-1',buyerId:'buyer-1',status:'OPEN'}}),update:jest.fn().mockResolvedValue({id:'response-1',status:'ACCEPTED'}),updateMany:jest.fn()},
      $transaction:jest.fn(),
    };
    audit={createInTransaction:jest.fn().mockResolvedValue(undefined)};
    prisma.$transaction.mockImplementation((fn:any)=>fn({
      marketplaceSellerProfile:{upsert:prisma.marketplaceSellerProfile.upsert},
      marketplaceFavorite:{upsert:prisma.marketplaceFavorite.upsert,update:prisma.marketplaceFavorite.update},
      marketplaceMessage:{create:prisma.marketplaceMessage.create,update:prisma.marketplaceMessage.update},
      marketplaceRFQ:{create:prisma.marketplaceRFQ.create,update:prisma.marketplaceRFQ.update},
      marketplaceRFQResponse:{upsert:prisma.marketplaceRFQResponse.upsert,update:prisma.marketplaceRFQResponse.update,updateMany:prisma.marketplaceRFQResponse.updateMany},
    }));
    service=new MarketplaceService(prisma,{assertCan:jest.fn().mockResolvedValue(undefined)} as any,audit,{validateResourceField:jest.fn(()=>({valid:true}))} as any);
  });

  it('never exposes a private seller phone number on the public profile',async()=>{
    const result=await service.getSellerProfile('seller-1');
    expect(result.publicPhone).toBeNull();
    expect(result.profile.publicPhone).toBeNull();
    expect(result.user).toMatchObject({id:'seller-1',isVerified:true});
  });

  it('saves favorites without deleting history when removed',async()=>{
    const saved=await service.addFavorite('buyer-1',UserRole.FARMER,'listing-1');
    expect(saved).toMatchObject({id:'favorite-1',status:'ACTIVE'});
    prisma.marketplaceFavorite.findUnique.mockResolvedValue({id:'favorite-1',status:'ACTIVE'});
    const removed=await service.removeFavorite('buyer-1','listing-1');
    expect(removed).toMatchObject({removed:true,favorite:{status:'REMOVED'}});
    expect(prisma.marketplaceFavorite.update).toHaveBeenCalledWith({where:{id:'favorite-1'},data:{status:'REMOVED'}});
  });

  it('restricts order-linked messages to the actual counterparty',async()=>{
    await expect(service.sendMessage('buyer-1',UserRole.FARMER,{recipientId:'someone-else',orderId:'order-1',body:'Hello'} as any)).rejects.toThrow(BadRequestException);
    expect(prisma.marketplaceMessage.create).not.toHaveBeenCalled();
  });

  it('prevents a buyer from submitting a seller quotation to their own RFQ',async()=>{
    await expect(service.respondToRFQ('buyer-1',UserRole.FARMER,'rfq-1',{unitPrice:10,availableQuantity:20} as any)).rejects.toThrow(BadRequestException);
    expect(prisma.marketplaceRFQResponse.upsert).not.toHaveBeenCalled();
  });

  it('rejects decisions on expired seller quotations',async()=>{
    prisma.marketplaceRFQResponse.findUnique.mockResolvedValue({id:'response-1',rfqId:'rfq-1',status:'SUBMITTED',validUntil:new Date(Date.now()-60000),rfq:{id:'rfq-1',buyerId:'buyer-1',status:'OPEN'}});
    await expect(service.decideRFQResponse('buyer-1',UserRole.FARMER,'rfq-1','response-1',{status:'ACCEPTED',reason:'Best price'} as any)).rejects.toThrow('quotation has expired');
    expect(prisma.marketplaceRFQ.update).not.toHaveBeenCalled();
  });

  it('allows the RFQ owner to award a submitted quotation and records audit',async()=>{
    const result=await service.decideRFQResponse('buyer-1',UserRole.FARMER,'rfq-1','response-1',{status:'ACCEPTED',reason:'Best delivered price'} as any);
    expect(result).toMatchObject({rfqStatus:'AWARDED',notice:expect.stringContaining('does not create an order')});
    expect(prisma.marketplaceRFQ.update).toHaveBeenCalledWith({where:{id:'rfq-1'},data:{status:'AWARDED'}});
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({action:'DECIDE_MARKETPLACE_RFQ_RESPONSE'}));
  });
});
